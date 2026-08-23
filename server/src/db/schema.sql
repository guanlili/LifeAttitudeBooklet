-- ============================================================
-- 人生 Attitude 册子 · SQLite Schema
-- 约定：ID 为 UUID 文本；时间为 ISO8601 文本；JSON 列存字符串
-- ============================================================

-- 用户：attitude_summary / attitude_tags 为画像缓存（条目增删后重算）
CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,
  nickname         TEXT UNIQUE NOT NULL,
  gender           TEXT,
  age              INTEGER,
  city             TEXT,
  avatar_emoji     TEXT,
  avatar_color     TEXT,
  bio              TEXT,
  attitude_summary TEXT,
  attitude_tags    TEXT DEFAULT '[]',   -- JSON: AttitudeTag[]
  is_seed          INTEGER DEFAULT 0,   -- 种子用户（演示生态）
  is_demo          INTEGER DEFAULT 0,   -- 演示账号「晨曦」
  created_at       TEXT
);

-- 引导会话：messages 持续追加 {role,content,ts}
CREATE TABLE IF NOT EXISTS guide_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  dimension  TEXT NOT NULL,             -- love/conflict/growth/family/values
  status     TEXT DEFAULT 'active',     -- active/completing/completed/abandoned
  messages   TEXT DEFAULT '[]',         -- JSON: GuideMsg[]
  turn_count INTEGER DEFAULT 0,         -- assistant 提问轮次
  created_at TEXT,
  updated_at TEXT
);

-- 册子条目：一次引导完成沉淀一条
CREATE TABLE IF NOT EXISTS booklet_entries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  session_id  TEXT,
  dimension   TEXT NOT NULL,
  title       TEXT,
  story       TEXT,                     -- 第一人称故事
  attitude    TEXT,                     -- 1-2 句态度句
  stance      TEXT,                     -- 立场（词表内）
  tags        TEXT DEFAULT '[]',        -- JSON: string[]
  depth_level INTEGER DEFAULT 1,        -- 1-3 表达深度
  created_at  TEXT
);

-- 匹配：创建即 accepted，score 0-1
CREATE TABLE IF NOT EXISTS matches (
  id                TEXT PRIMARY KEY,
  user_a            TEXT NOT NULL,
  user_b            TEXT NOT NULL,
  score             REAL,
  reasons           TEXT DEFAULT '[]',  -- JSON: string[]
  shared_dimensions TEXT DEFAULT '[]',  -- JSON: string[]
  status            TEXT DEFAULT 'accepted',
  created_at        TEXT
);

-- 对话消息
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL,
  sender_id  TEXT NOT NULL,
  content    TEXT NOT NULL,
  msg_type   TEXT DEFAULT 'text',       -- text/icebreaker/reconnect
  created_at TEXT
);

-- 破冰话题（懒生成并缓存）
CREATE TABLE IF NOT EXISTS icebreakers (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL,
  topic      TEXT NOT NULL,
  context    TEXT,
  used       INTEGER DEFAULT 0,
  created_at TEXT
);

-- 长联触达（懒生成；to_user 为建议触达的对方）
CREATE TABLE IF NOT EXISTS reconnect_triggers (
  id           TEXT PRIMARY KEY,
  match_id     TEXT NOT NULL,
  to_user      TEXT NOT NULL,
  trigger_type TEXT NOT NULL,           -- silence/new_entry/resonance
  message      TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',  -- pending/sent/dismissed
  created_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_user       ON booklet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user      ON guide_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_match     ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matches_a          ON matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_b          ON matches(user_b);
CREATE INDEX IF NOT EXISTS idx_triggers_match     ON reconnect_triggers(match_id, status);
-- 同一 match 对同一方向最多一条 pending 触达（并发懒生成兼容）
CREATE UNIQUE INDEX IF NOT EXISTS idx_reconnect_pending_unique ON reconnect_triggers(match_id, to_user) WHERE status='pending';
