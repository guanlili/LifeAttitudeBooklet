import { Router, type Request, type RequestHandler, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, now, toMatch, toMessage, toTrigger, toUser } from '../db/connection.js';
import { scoreMatch } from '../domain/matching.js';
import { config } from '../config.js';
import * as ai from '../ai/index.js';
import { hashStr } from '../ai/mock.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export const reconnectRouter = Router();

const entriesOf = (userId: string) =>
  (db.prepare('SELECT * FROM booklet_entries WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[])
    .map((r: any) => ({ ...r, depthLevel: r.depth_level ?? 1 }));

/**
 * 懒生成（业务规则 5）：扫描当前用户所有 accepted match，
 * 消息数≥1、最后一条消息沉默超过 RECONNECT_SILENT_MINUTES、且无 pending 触达时生成。
 * 空消息的 match 属破冰阶段，不生成。
 */
async function generateTriggersFor(userId: string): Promise<void> {
  const matches = db
    .prepare(`SELECT * FROM matches WHERE (user_a = ? OR user_b = ?) AND status = 'accepted'`)
    .all(userId, userId) as any[];

  for (const m of matches) {
    const otherId = m.user_a === userId ? m.user_b : m.user_a;
    const lastMsg = db
      .prepare('SELECT * FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(m.id) as any;
    if (!lastMsg) continue; // 破冰阶段

    const silentMinutes = (Date.now() - Date.parse(lastMsg.created_at)) / 60_000;
    if (silentMinutes <= config.reconnectSilentMinutes) continue;

    const pending = db
      .prepare(
        `SELECT COUNT(*) AS c FROM reconnect_triggers WHERE match_id = ? AND status = 'pending' AND to_user = ?`,
      )
      .get(m.id, otherId) as any;
    if (pending.c > 0) continue;

    const other = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId) as any;
    const otherEntries = entriesOf(otherId);

    // 触达类型：对方沉默后有新条目 → new_entry；立场有共鸣 → resonance；否则 silence
    let triggerType: 'silence' | 'new_entry' | 'resonance' = 'silence';
    let dimension = otherEntries[0]?.dimension ?? 'love';
    const newEntry = otherEntries.find((e) => e.created_at > lastMsg.created_at);
    const result = scoreMatch(entriesOf(userId), otherEntries);
    if (newEntry) {
      triggerType = 'new_entry';
      dimension = newEntry.dimension;
    } else if (result.sharedStances.length > 0 && hashStr(m.id) % 2 === 0) {
      triggerType = 'resonance';
      dimension = result.sharedStances[0].split(':')[0];
    }

    const { message } = await ai.genReconnect(triggerType, other.nickname, dimension, m.id);
    try {
      db.prepare(
        `INSERT INTO reconnect_triggers (id, match_id, to_user, trigger_type, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      ).run(randomUUID(), m.id, otherId, triggerType, message, now());
    } catch (err: any) {
      // 并发懒生成：另一请求已插入同向 pending 触达，命中唯一索引时静默跳过
      const isUnique =
        err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || String(err?.message ?? '').includes('UNIQUE');
      if (!isUnique) throw err;
    }
  }
}

// 触达列表（懒生成后返回建议当前用户发出的 pending 触达）
reconnectRouter.get(
  '/',
  wrap(async (req, res) => {
    await generateTriggersFor(req.userId);

    const rows = db
      .prepare(
        `SELECT t.* FROM reconnect_triggers t
         JOIN matches m ON m.id = t.match_id
         WHERE t.status = 'pending' AND t.to_user != ? AND (m.user_a = ? OR m.user_b = ?)
         ORDER BY t.created_at DESC`,
      )
      .all(req.userId, req.userId, req.userId) as any[];

    const triggers = rows.map((t) => {
      const matchRow = db.prepare('SELECT * FROM matches WHERE id = ?').get(t.match_id);
      const other = db.prepare('SELECT * FROM users WHERE id = ?').get(t.to_user);
      return { ...toTrigger(t), match: toMatch(matchRow), otherUser: toUser(other) };
    });

    res.json({ triggers });
  }),
);

// 发送触达：以当前用户身份把 trigger.message 发进对话（msg_type='reconnect'）
reconnectRouter.post(
  '/:triggerId/send',
  wrap((req, res) => {
    const t = db
      .prepare('SELECT * FROM reconnect_triggers WHERE id = ?')
      .get(req.params.triggerId) as any;
    if (!t) return res.status(404).json({ error: '触达不存在' });
    if (t.status !== 'pending') return res.status(400).json({ error: '触达已处理' });
    const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(t.match_id) as any;
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId) || t.to_user === req.userId) {
      return res.status(403).json({ error: '无权操作该触达' });
    }

    const msgId = randomUUID();
    db.prepare(
      `INSERT INTO messages (id, match_id, sender_id, content, msg_type, created_at)
       VALUES (?, ?, ?, ?, 'reconnect', ?)`,
    ).run(msgId, t.match_id, req.userId, t.message, now());
    db.prepare(`UPDATE reconnect_triggers SET status = 'sent' WHERE id = ?`).run(t.id);

    const message = toMessage(db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId));
    res.json({ ok: true, message });
  }),
);

// 忽略触达
reconnectRouter.post(
  '/:triggerId/dismiss',
  wrap((req, res) => {
    const t = db
      .prepare('SELECT * FROM reconnect_triggers WHERE id = ?')
      .get(req.params.triggerId) as any;
    if (!t) return res.status(404).json({ error: '触达不存在' });
    const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(t.match_id) as any;
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(403).json({ error: '无权操作该触达' });
    }
    db.prepare(`UPDATE reconnect_triggers SET status = 'dismissed' WHERE id = ?`).run(t.id);
    res.json({ ok: true });
  }),
);
