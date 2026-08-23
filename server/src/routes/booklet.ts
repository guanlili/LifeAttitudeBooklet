import { Router, type Request, type RequestHandler, type Response } from 'express';
import { db, toEntry, toUser } from '../db/connection.js';
import { aggregateTags } from '../domain/matching.js';
import * as ai from '../ai/index.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/** 画像刷新：条目增删后重算 attitude_summary 与 attitude_tags（guide 路由也复用） */
export async function refreshUserProfile(userId: string): Promise<void> {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return;
  const entries = (
    db.prepare('SELECT * FROM booklet_entries WHERE user_id = ? ORDER BY created_at').all(userId) as any[]
  ).map(toEntry);
  const tags = aggregateTags(entries);
  const { summary } = await ai.refreshProfile(
    user.nickname,
    entries.map((e) => ({ dimension: e.dimension, stance: e.stance, attitude: e.attitude })),
  );
  db.prepare('UPDATE users SET attitude_summary = ?, attitude_tags = ? WHERE id = ?').run(
    summary,
    JSON.stringify(tags),
    userId,
  );
}

export const bookletRouter = Router();

// 查看册子（默认自己，可看他人）
bookletRouter.get(
  '/',
  wrap((req, res) => {
    const userId =
      typeof req.query.userId === 'string' && req.query.userId ? req.query.userId : req.userId;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const entries = (
      db
        .prepare('SELECT * FROM booklet_entries WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as any[]
    ).map(toEntry);
    const profile = toUser(user);
    res.json({
      entries,
      profile: { attitudeSummary: profile.attitudeSummary, tags: profile.attitudeTags },
    });
  }),
);

bookletRouter.get(
  '/entry/:id',
  wrap((req, res) => {
    const row = db.prepare('SELECT * FROM booklet_entries WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '条目不存在' });
    res.json({ entry: toEntry(row) });
  }),
);

// 删除条目（仅本人），删后刷新画像
bookletRouter.delete(
  '/entry/:id',
  wrap(async (req, res) => {
    const row = db.prepare('SELECT * FROM booklet_entries WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: '条目不存在' });
    if (row.user_id !== req.userId) return res.status(403).json({ error: '只能删除自己的条目' });
    db.prepare('DELETE FROM booklet_entries WHERE id = ?').run(req.params.id);
    await refreshUserProfile(req.userId);
    res.json({ ok: true });
  }),
);
