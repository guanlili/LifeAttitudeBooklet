import { Router, type Request, type RequestHandler, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, now, toUser } from '../db/connection.js';
import { hashStr } from '../ai/mock.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

const AVATAR_EMOJIS = ['🦊', '🐳', '🌵', '🍑', '🌙', '🫧', '🍞', '🐈', '🦉', '🌊', '🍋', '🫐', '🌿', '🐚', '⛰️', '🔥'];
const AVATAR_COLORS = ['#F4A261', '#2A9D8F', '#E76F51', '#8AB17D', '#6D6875', '#457B9D', '#B5838D', '#E9C46A', '#84A59D', '#F28482'];

export const authRouter = Router();

// 登录：按 nickname 取或建
authRouter.post(
  '/login',
  wrap((req, res) => {
    const { nickname, gender, age, city } = req.body ?? {};
    if (typeof nickname !== 'string' || !nickname.trim()) {
      return res.status(400).json({ error: '昵称不能为空' });
    }
    const name = nickname.trim();
    const existing = db.prepare('SELECT * FROM users WHERE nickname = ?').get(name);
    if (existing) return res.json({ user: toUser(existing) });

    const id = randomUUID();
    const h = hashStr(name);
    db.prepare(
      `INSERT INTO users (id, nickname, gender, age, city, avatar_emoji, avatar_color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      typeof gender === 'string' ? gender : null,
      Number.isFinite(Number(age)) && age !== undefined && age !== null ? Number(age) : null,
      typeof city === 'string' ? city : null,
      AVATAR_EMOJIS[h % AVATAR_EMOJIS.length],
      AVATAR_COLORS[h % AVATAR_COLORS.length],
      now(),
    );
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ user: toUser(row) });
  }),
);

// 演示账号「晨曦」
authRouter.post(
  '/demo',
  wrap((_req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE is_demo = 1 LIMIT 1').get();
    if (!row) return res.status(404).json({ error: '演示账号不存在，请先执行 npm run seed' });
    res.json({ user: toUser(row) });
  }),
);

// 需登录态的 /api/me（挂在认证中间件之后）
export const meRouter = Router();

meRouter.get(
  '/me',
  wrap((req, res) => {
    const userId = req.userId;
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const entryCount = (
      db.prepare('SELECT COUNT(*) AS c FROM booklet_entries WHERE user_id = ?').get(userId) as any
    ).c as number;
    const dims = db
      .prepare('SELECT DISTINCT dimension FROM booklet_entries WHERE user_id = ?')
      .all(userId) as any[];
    const matchCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM matches WHERE (user_a = ? OR user_b = ?) AND status = 'accepted'`,
        )
        .get(userId, userId) as any
    ).c as number;
    // 待处理触达：我的 match 中、建议我发出的 pending 触达
    const pendingTriggers = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM reconnect_triggers t
           JOIN matches m ON m.id = t.match_id
           WHERE t.status = 'pending' AND t.to_user != ? AND (m.user_a = ? OR m.user_b = ?)`,
        )
        .get(userId, userId, userId) as any
    ).c as number;

    res.json({
      user: toUser(row),
      stats: {
        entryCount,
        dimensionsCovered: dims.map((d) => d.dimension as string),
        matchCount,
        pendingTriggers,
      },
    });
  }),
);
