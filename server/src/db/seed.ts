/**
 * 种子脚本：删库重建 → 建表 → 灌入 12 个种子用户 + 演示账号「晨曦」。
 * 可重复执行（幂等）。运行：npm run seed
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { db, initSchema } from './connection.js';
import { aggregateTags, buildReasons, scoreMatch } from '../domain/matching.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SeedEntry {
  dimension: string;
  title: string;
  story: string;
  attitude: string;
  stance: string;
  tags: string[];
  depthLevel: number;
}

interface SeedUser {
  nickname: string;
  gender: string;
  age: number;
  city: string;
  avatarEmoji: string;
  avatarColor: string;
  bio: string;
  attitudeSummary: string;
  entries: SeedEntry[];
}

interface SeedData {
  demoUser: SeedUser;
  seedUsers: SeedUser[];
  demoMatches: Array<{
    with: string;
    messages: Array<{ from: string; minutesAgo: number; content: string }>;
  }>;
}

const data: SeedData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'),
);

const iso = (msAgo: number): string => new Date(Date.now() - msAgo).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// ---------- 1. 删库重建 ----------
db.exec(`
  DROP TABLE IF EXISTS reconnect_triggers;
  DROP TABLE IF EXISTS icebreakers;
  DROP TABLE IF EXISTS messages;
  DROP TABLE IF EXISTS matches;
  DROP TABLE IF EXISTS booklet_entries;
  DROP TABLE IF EXISTS guide_sessions;
  DROP TABLE IF EXISTS users;
`);
initSchema();

// ---------- 2. 灌入用户与条目 ----------
const insertUser = db.prepare(
  `INSERT INTO users (id, nickname, gender, age, city, avatar_emoji, avatar_color, bio,
    attitude_summary, attitude_tags, is_seed, is_demo, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertEntry = db.prepare(
  `INSERT INTO booklet_entries (id, user_id, session_id, dimension, title, story, attitude, stance, tags, depth_level, created_at)
   VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

const userIds = new Map<string, string>();

function seedOneUser(u: SeedUser, opts: { isSeed: boolean; isDemo: boolean; daysAgo: number }) {
  const id = randomUUID();
  userIds.set(u.nickname, id);
  const tags = aggregateTags(u.entries);
  insertUser.run(
    id,
    u.nickname,
    u.gender,
    u.age,
    u.city,
    u.avatarEmoji,
    u.avatarColor,
    u.bio,
    u.attitudeSummary,
    JSON.stringify(tags),
    opts.isSeed ? 1 : 0,
    opts.isDemo ? 1 : 0,
    iso(opts.daysAgo * DAY),
  );
  // 条目时间错开：10-30 天前，早于演示消息（3 天前），避免误判为"新条目"触达
  u.entries.forEach((e, i) => {
    insertEntry.run(
      randomUUID(),
      id,
      e.dimension,
      e.title,
      e.story,
      e.attitude,
      e.stance,
      JSON.stringify(e.tags),
      e.depthLevel,
      iso((30 - i * 5) * DAY - Math.floor(Math.random() * 12) * 60 * MIN),
    );
  });
}

seedOneUser(data.demoUser, { isSeed: false, isDemo: true, daysAgo: 45 });
data.seedUsers.forEach((u, i) => seedOneUser(u, { isSeed: true, isDemo: false, daysAgo: 60 + i }));

// ---------- 3. 演示 match 与消息 ----------
const insertMatch = db.prepare(
  `INSERT INTO matches (id, user_a, user_b, score, reasons, shared_dimensions, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, 'accepted', ?)`,
);
const insertMessage = db.prepare(
  `INSERT INTO messages (id, match_id, sender_id, content, msg_type, created_at)
   VALUES (?, ?, ?, ?, 'text', ?)`,
);

const demoId = userIds.get(data.demoUser.nickname)!;
const entriesOf = (userId: string) =>
  (db.prepare('SELECT dimension, stance, depth_level FROM booklet_entries WHERE user_id = ?').all(userId) as any[])
    .map((r: any) => ({ ...r, depthLevel: r.depth_level ?? 1 }));

for (const dm of data.demoMatches) {
  const otherId = userIds.get(dm.with);
  if (!otherId) {
    console.warn(`[seed] 未找到用户「${dm.with}」，跳过该 match`);
    continue;
  }
  const theirEntries = entriesOf(otherId);
  const result = scoreMatch(entriesOf(demoId), theirEntries);
  const matchId = randomUUID();
  insertMatch.run(
    matchId,
    demoId,
    otherId,
    result.score,
    JSON.stringify(buildReasons(result, theirEntries.length)),
    JSON.stringify(result.sharedDimensions),
    iso(5 * DAY),
  );
  for (const msg of dm.messages) {
    const senderId = userIds.get(msg.from);
    if (!senderId) continue;
    insertMessage.run(randomUUID(), matchId, senderId, msg.content, iso(msg.minutesAgo * MIN));
  }
}

// ---------- 4. 汇总 ----------
const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as any).c;

console.log('[seed] 完成 ✅');
console.log(`[seed] users=${count('users')} (含演示账号「${data.demoUser.nickname}」)`);
console.log(`[seed] booklet_entries=${count('booklet_entries')}`);
console.log(`[seed] matches=${count('matches')} messages=${count('messages')}`);
