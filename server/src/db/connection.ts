import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 数据库文件固定在 server/data/app.db（git 忽略）
const dataDir = path.resolve(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, 'app.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

/** 按 schema.sql 建表（IF NOT EXISTS，可重复执行） */
export function initSchema(): void {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}
initSchema();

export const now = (): string => new Date().toISOString();

function parseJsonCol<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- 行 → API camelCase 映射 ----------

export interface AttitudeTag {
  dimension: string;
  stance: string;
  label: string;
  weight: number;
}

export function toUser(row: any) {
  return {
    id: row.id,
    nickname: row.nickname,
    gender: row.gender ?? null,
    age: row.age ?? null,
    city: row.city ?? null,
    avatarEmoji: row.avatar_emoji ?? null,
    avatarColor: row.avatar_color ?? null,
    bio: row.bio ?? null,
    attitudeSummary: row.attitude_summary ?? null,
    attitudeTags: parseJsonCol<AttitudeTag[]>(row.attitude_tags, []),
    isSeed: !!row.is_seed,
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
  };
}

export function toEntry(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id ?? null,
    dimension: row.dimension,
    title: row.title,
    story: row.story,
    attitude: row.attitude,
    stance: row.stance,
    tags: parseJsonCol<string[]>(row.tags, []),
    depthLevel: row.depth_level ?? 1,
    createdAt: row.created_at,
  };
}

export function toMatch(row: any) {
  return {
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    score: row.score,
    reasons: parseJsonCol<string[]>(row.reasons, []),
    sharedDimensions: parseJsonCol<string[]>(row.shared_dimensions, []),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toMessage(row: any) {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    content: row.content,
    msgType: row.msg_type,
    createdAt: row.created_at,
  };
}

export function toIcebreaker(row: any) {
  return {
    id: row.id,
    matchId: row.match_id,
    topic: row.topic,
    context: row.context ?? null,
    used: !!row.used,
    createdAt: row.created_at,
  };
}

export function toTrigger(row: any) {
  return {
    id: row.id,
    matchId: row.match_id,
    toUser: row.to_user,
    triggerType: row.trigger_type,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface GuideMsg {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

export function sessionMessages(row: any): GuideMsg[] {
  return parseJsonCol<GuideMsg[]>(row.messages, []);
}

export function toSessionBrief(row: any) {
  return {
    id: row.id,
    dimension: row.dimension,
    status: row.status,
    turnCount: row.turn_count ?? 0,
  };
}
