import { Router, type Request, type RequestHandler, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  db,
  now,
  sessionMessages,
  toEntry,
  toSessionBrief,
  type GuideMsg,
} from '../db/connection.js';
import { DIMENSIONS, isDimension, type Dimension } from '../domain/dimensions.js';
import * as ai from '../ai/index.js';
import { refreshUserProfile } from './booklet.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/** 引导策略常量：提问上限 5、有效回复满 3 轮可完成（第 4 轮或触顶时收束） */
const MAX_ASSISTANT_QUESTIONS = 5;
const MIN_EFFECTIVE_REPLIES = 3;
const TARGET_EFFECTIVE_REPLIES = 4;

export const guideRouter = Router();

/** 不传 dimension 时选用户条目覆盖最少的维度 */
function pickDimension(userId: string): Dimension {
  const rows = db
    .prepare('SELECT dimension, COUNT(*) AS c FROM booklet_entries WHERE user_id = ? GROUP BY dimension')
    .all(userId) as any[];
  const counts = new Map<string, number>(rows.map((r) => [r.dimension, r.c]));
  let best: Dimension = DIMENSIONS[0].key;
  let min = Infinity;
  for (const d of DIMENSIONS) {
    const c = counts.get(d.key) ?? 0;
    if (c < min) {
      min = c;
      best = d.key;
    }
  }
  return best;
}

// 开始一次引导会话（开场 = 探讨性小故事 + 第一问）
guideRouter.post(
  '/start',
  wrap(async (req, res) => {
    const raw = req.body?.dimension;
    if (raw !== undefined && raw !== null && raw !== '' && !isDimension(raw)) {
      return res.status(400).json({ error: '无效的维度' });
    }
    const dimension: Dimension = isDimension(raw) ? raw : pickDimension(req.userId);

    // 先在事务外完成 async 的 AI 开场调用
    const id = randomUUID();
    const { content } = await ai.guideOpen(dimension, id);
    const messages: GuideMsg[] = [{ role: 'assistant', content, ts: now() }];

    // 一次只保留一个进行中的会话：废弃旧 active + 插入新会话必须原子执行，
    // 避免并发 start 时两个请求都返回 active 但先完成者实际已被废弃的竞态窗口
    db.transaction(() => {
      db.prepare(
        `UPDATE guide_sessions SET status = 'abandoned', updated_at = ? WHERE user_id = ? AND status = 'active'`,
      ).run(now(), req.userId);
      db.prepare(
        `INSERT INTO guide_sessions (id, user_id, dimension, status, messages, turn_count, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, 1, ?, ?)`,
      ).run(id, req.userId, dimension, JSON.stringify(messages), now(), now());
    })();

    const row = db.prepare('SELECT * FROM guide_sessions WHERE id = ?').get(id);
    res.json({
      session: toSessionBrief(row),
      message: { role: 'assistant' as const, content },
    });
  }),
);

// 用户回复一轮（done 时创建册子条目、会话置 completed、刷新画像）
guideRouter.post(
  '/:sessionId/message',
  wrap(async (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) return res.status(400).json({ error: '内容不能为空' });

    const row = db
      .prepare('SELECT * FROM guide_sessions WHERE id = ?')
      .get(req.params.sessionId) as any;
    if (!row || row.user_id !== req.userId) return res.status(404).json({ error: '会话不存在' });
    if (row.status !== 'active') return res.status(400).json({ error: '会话已结束' });

    const dimension = row.dimension as Dimension;
    const messages = sessionMessages(row);
    messages.push({ role: 'user', content, ts: now() });

    const effective = ai.effectiveReplies(messages).length;
    const assistantQs = messages.filter((m) => m.role === 'assistant').length;
    const done =
      effective >= TARGET_EFFECTIVE_REPLIES ||
      (assistantQs >= MAX_ASSISTANT_QUESTIONS && effective >= MIN_EFFECTIVE_REPLIES) ||
      assistantQs >= MAX_ASSISTANT_QUESTIONS + 1;

    if (!done) {
      const { content: replyText } = await ai.guideNext(dimension, row.id, messages);
      messages.push({ role: 'assistant', content: replyText, ts: now() });
      db.prepare(
        'UPDATE guide_sessions SET messages = ?, turn_count = turn_count + 1, updated_at = ? WHERE id = ?',
      ).run(JSON.stringify(messages), now(), row.id);
      return res.json({ reply: { role: 'assistant' as const, content: replyText }, done: false });
    }

    // 完成：抢占 completing（防并发重复入库）→ 提取条目 → 事务落库 → 刷新画像
    const claimed = db
      .prepare(`UPDATE guide_sessions SET status = 'completing', updated_at = ? WHERE id = ? AND status = 'active'`)
      .run(now(), row.id);
    if (claimed.changes === 0) return res.status(400).json({ error: '会话已结束' });

    const entryId = randomUUID();
    let closing: string;
    try {
      const extracted = await ai.extractEntry(dimension, messages);
      closing = ai.closingMessage(row.id);
      messages.push({ role: 'assistant', content: closing, ts: now() });

      db.transaction(() => {
        db.prepare(
          `INSERT INTO booklet_entries (id, user_id, session_id, dimension, title, story, attitude, stance, tags, depth_level, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          entryId,
          req.userId,
          row.id,
          dimension,
          extracted.title,
          extracted.story,
          extracted.attitude,
          extracted.stance,
          JSON.stringify(extracted.tags),
          extracted.depthLevel,
          now(),
        );
        db.prepare(
          `UPDATE guide_sessions SET status = 'completed', messages = ?, turn_count = turn_count + 1, updated_at = ? WHERE id = ?`,
        ).run(JSON.stringify(messages), now(), row.id);
      })();
    } catch (err) {
      // 提取或落库失败：还原为 active，避免会话卡死在 completing
      db.prepare(`UPDATE guide_sessions SET status = 'active', updated_at = ? WHERE id = ?`).run(now(), row.id);
      throw err;
    }

    await refreshUserProfile(req.userId);

    const entryRow = db.prepare('SELECT * FROM booklet_entries WHERE id = ?').get(entryId);
    res.json({
      reply: { role: 'assistant' as const, content: closing },
      done: true,
      entry: toEntry(entryRow),
    });
  }),
);

// 当前进行中的会话
guideRouter.get(
  '/active',
  wrap((req, res) => {
    const row = db
      .prepare(
        `SELECT * FROM guide_sessions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      )
      .get(req.userId) as any;
    if (!row) return res.json({ session: null, messages: [] });
    res.json({ session: toSessionBrief(row), messages: sessionMessages(row) });
  }),
);
