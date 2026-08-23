import { Router, type Request, type RequestHandler, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  db,
  now,
  toIcebreaker,
  toMatch,
  toMessage,
  toUser,
  type AttitudeTag,
} from '../db/connection.js';
import { scoreMatch } from '../domain/matching.js';
import * as ai from '../ai/index.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// 挂载在 /api 下：/chat/:matchId/* 与 /icebreakers/:id/use
export const chatRouter = Router();

/** 校验 match 归属并取出对方 */
function loadMatch(matchId: string, userId: string) {
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
  if (!row || (row.user_a !== userId && row.user_b !== userId)) return null;
  const otherId = row.user_a === userId ? row.user_b : row.user_a;
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId) as any;
  return { row, other };
}

const entriesOf = (userId: string) =>
  (db.prepare('SELECT * FROM booklet_entries WHERE user_id = ?').all(userId) as any[])
    .map((r: any) => ({ ...r, depthLevel: r.depth_level ?? 1 }));

const parseTags = (raw: unknown): AttitudeTag[] => {
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as AttitudeTag[]) : [];
  } catch {
    return [];
  }
};

// 对话详情
chatRouter.get(
  '/chat/:matchId',
  wrap((req, res) => {
    const found = loadMatch(req.params.matchId, req.userId);
    if (!found) return res.status(404).json({ error: '匹配不存在' });
    const messages = (
      db
        .prepare('SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC')
        .all(found.row.id) as any[]
    ).map(toMessage);
    res.json({ match: toMatch(found.row), otherUser: toUser(found.other), messages });
  }),
);

// 发消息（种子用户首次收到消息时自动回复一次，之后永久沉默）
chatRouter.post(
  '/chat/:matchId/messages',
  wrap(async (req, res) => {
    const found = loadMatch(req.params.matchId, req.userId);
    if (!found) return res.status(404).json({ error: '匹配不存在' });

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) return res.status(400).json({ error: '内容不能为空' });
    const msgType = ['text', 'icebreaker', 'reconnect'].includes(req.body?.msgType)
      ? (req.body.msgType as string)
      : 'text';

    const msgId = randomUUID();
    db.prepare(
      `INSERT INTO messages (id, match_id, sender_id, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(msgId, found.row.id, req.userId, content, msgType, now());

    // 业务规则 4：对方是种子且在该 match 中从未发过言 → 生成一条 persona 回复
    let autoReply = null;
    const otherSpoken = (
      db
        .prepare('SELECT COUNT(*) AS c FROM messages WHERE match_id = ? AND sender_id = ?')
        .get(found.row.id, found.other.id) as any
    ).c as number;
    if (found.other.is_seed === 1 && otherSpoken === 0) {
      const replyText = ai.seedReply(
        found.other.nickname,
        parseTags(found.other.attitude_tags),
        content,
      );
      const replyId = randomUUID();
      // 时间戳 +1s 保证排序在用户消息之后
      const replyTs = new Date(Date.now() + 1000).toISOString();
      db.prepare(
        `INSERT INTO messages (id, match_id, sender_id, content, msg_type, created_at) VALUES (?, ?, ?, ?, 'text', ?)`,
      ).run(replyId, found.row.id, found.other.id, replyText, replyTs);
      autoReply = toMessage(db.prepare('SELECT * FROM messages WHERE id = ?').get(replyId));
    }

    const message = toMessage(db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId));
    res.json({ message, autoReply });
  }),
);

/** 基于双方册子生成 3 条破冰话题并写库 */
async function generateIcebreakers(matchRow: any, me: string, other: any, offset: number) {
  const meRow = db.prepare('SELECT * FROM users WHERE id = ?').get(me) as any;
  const myEntries = entriesOf(me);
  const theirEntries = entriesOf(other.id);
  const result = scoreMatch(myEntries, theirEntries);
  const allDims = [
    ...new Set([...myEntries, ...theirEntries].map((e: any) => e.dimension as string)),
  ];
  const topics = await ai.genIcebreakers(
    meRow.nickname,
    other.nickname,
    parseTags(meRow.attitude_tags),
    parseTags(other.attitude_tags),
    result,
    allDims,
    offset,
  );
  const insert = db.prepare(
    `INSERT INTO icebreakers (id, match_id, topic, context, used, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
  );
  for (const t of topics) {
    insert.run(randomUUID(), matchRow.id, t.topic, t.context, now());
  }
}

// 破冰话题：无未使用话题时生成 3 条并缓存
chatRouter.get(
  '/chat/:matchId/icebreakers',
  wrap(async (req, res) => {
    const found = loadMatch(req.params.matchId, req.userId);
    if (!found) return res.status(404).json({ error: '匹配不存在' });

    let unused = db
      .prepare('SELECT * FROM icebreakers WHERE match_id = ? AND used = 0 ORDER BY created_at')
      .all(found.row.id) as any[];
    if (unused.length === 0) {
      const total = (
        db.prepare('SELECT COUNT(*) AS c FROM icebreakers WHERE match_id = ?').get(found.row.id) as any
      ).c as number;
      await generateIcebreakers(found.row, req.userId, found.other, total);
      unused = db
        .prepare('SELECT * FROM icebreakers WHERE match_id = ? AND used = 0 ORDER BY created_at')
        .all(found.row.id) as any[];
    }
    res.json({ topics: unused.map(toIcebreaker) });
  }),
);

// 重新生成 3 条破冰话题
chatRouter.post(
  '/chat/:matchId/icebreakers/refresh',
  wrap(async (req, res) => {
    const found = loadMatch(req.params.matchId, req.userId);
    if (!found) return res.status(404).json({ error: '匹配不存在' });

    const total = (
      db.prepare('SELECT COUNT(*) AS c FROM icebreakers WHERE match_id = ?').get(found.row.id) as any
    ).c as number;
    db.prepare('DELETE FROM icebreakers WHERE match_id = ? AND used = 0').run(found.row.id);
    await generateIcebreakers(found.row, req.userId, found.other, total + 1);

    const unused = db
      .prepare('SELECT * FROM icebreakers WHERE match_id = ? AND used = 0 ORDER BY created_at')
      .all(found.row.id) as any[];
    res.json({ topics: unused.map(toIcebreaker) });
  }),
);

// 标记话题已使用
chatRouter.post(
  '/icebreakers/:id/use',
  wrap((req, res) => {
    const row = db.prepare('SELECT * FROM icebreakers WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: '话题不存在' });
    const found = loadMatch(row.match_id, req.userId);
    if (!found) return res.status(403).json({ error: '无权操作该话题' });
    db.prepare('UPDATE icebreakers SET used = 1 WHERE id = ?').run(row.id);
    res.json({ ok: true });
  }),
);
