import { Router, type Request, type RequestHandler, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, now, toEntry, toMatch, toMessage, toUser } from '../db/connection.js';
import { buildReasons, scoreMatch, type EntryLike } from '../domain/matching.js';
import * as ai from '../ai/index.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export const matchRouter = Router();

const entriesOf = (userId: string) =>
  (db
    .prepare('SELECT * FROM booklet_entries WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as any[]).map((r: any) => ({ ...r, depthLevel: r.depth_level ?? 1 }));

/** 当前用户已建立 match 的对象 id 集合 */
function matchedUserIds(userId: string): Set<string> {
  const rows = db
    .prepare('SELECT user_a, user_b FROM matches WHERE user_a = ? OR user_b = ?')
    .all(userId, userId) as any[];
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.user_a === userId ? r.user_b : r.user_a);
  return ids;
}

// 推荐：排除自己与已匹配对象，最多 10 条按 score 降序
matchRouter.get(
  '/recommendations',
  wrap((req, res) => {
    const myEntries: EntryLike[] = entriesOf(req.userId);
    if (myEntries.length === 0) {
      return res.json({ needMoreEntries: true, recommendations: [] });
    }
    const excluded = matchedUserIds(req.userId);
    const candidates = (db.prepare('SELECT * FROM users WHERE id != ?').all(req.userId) as any[])
      .filter((u) => !excluded.has(u.id));

    const recommendations = candidates
      .map((u) => {
        const theirEntries = entriesOf(u.id);
        const result = scoreMatch(myEntries, theirEntries);
        return {
          user: toUser(u),
          score: result.score,
          reasons: buildReasons(result, theirEntries.length),
          sharedDimensions: result.sharedDimensions,
          previewEntries: theirEntries.slice(0, 2).map(toEntry),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ needMoreEntries: false, recommendations });
  }),
);

// 建立连接（直接 accepted；幂等）
matchRouter.post(
  '/connect',
  wrap(async (req, res) => {
    const targetUserId = req.body?.targetUserId;
    if (typeof targetUserId !== 'string' || !targetUserId) {
      return res.status(400).json({ error: '缺少 targetUserId' });
    }
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: '不能与自己建立连接' });
    }
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
    if (!target) return res.status(404).json({ error: '目标用户不存在' });

    const existing = db
      .prepare(
        'SELECT * FROM matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)',
      )
      .get(req.userId, targetUserId, targetUserId, req.userId);
    if (existing) return res.json({ match: toMatch(existing) });

    const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
    const myEntries = entriesOf(req.userId);
    const theirEntries = entriesOf(targetUserId);
    const result = scoreMatch(myEntries, theirEntries);
    const { reasons } = await ai.matchReasons(
      me.nickname,
      target.nickname,
      result,
      theirEntries.length,
    );

    const id = randomUUID();
    db.prepare(
      `INSERT INTO matches (id, user_a, user_b, score, reasons, shared_dimensions, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'accepted', ?)`,
    ).run(
      id,
      req.userId,
      targetUserId,
      result.score,
      JSON.stringify(reasons),
      JSON.stringify(result.sharedDimensions),
      now(),
    );
    const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.json({ match: toMatch(row) });
  }),
);

// 我的连接列表（带最后一条消息与沉默分钟数）
matchRouter.get(
  '/list',
  wrap((req, res) => {
    const rows = db
      .prepare(
        `SELECT * FROM matches WHERE (user_a = ? OR user_b = ?) AND status = 'accepted' ORDER BY created_at DESC`,
      )
      .all(req.userId, req.userId) as any[];

    const matches = rows.map((r) => {
      const otherId = r.user_a === req.userId ? r.user_b : r.user_a;
      const other = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId);
      const lastRow = db
        .prepare('SELECT * FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(r.id) as any;
      const lastMessage = lastRow ? toMessage(lastRow) : null;
      const silentMinutes = lastRow
        ? Math.max(0, Math.floor((Date.now() - Date.parse(lastRow.created_at)) / 60_000))
        : null;
      return { match: toMatch(r), otherUser: toUser(other), lastMessage, silentMinutes };
    });

    // 最近有消息的排前面
    matches.sort((a, b) => {
      const ta = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : Date.parse(a.match.createdAt);
      const tb = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : Date.parse(b.match.createdAt);
      return tb - ta;
    });

    res.json({ matches });
  }),
);
