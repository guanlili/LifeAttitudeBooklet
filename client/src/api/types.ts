export type Dimension = 'love' | 'conflict' | 'growth' | 'family' | 'values';

export interface AttitudeTag {
  dimension: Dimension;
  stance: string;
  label: string;
  weight: number;
}

export interface User {
  id: string;
  nickname: string;
  gender: string | null;
  age: number | null;
  city: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  bio: string | null;
  attitudeSummary: string | null;
  attitudeTags: AttitudeTag[];
  isSeed: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface Entry {
  id: string;
  userId: string;
  sessionId: string | null;
  dimension: Dimension;
  title: string;
  story: string;
  attitude: string;
  stance: string;
  tags: string[];
  depthLevel: number;
  createdAt: string;
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  score: number;
  reasons: string[];
  sharedDimensions: string[];
  status: string;
  createdAt: string;
}

export type MsgType = 'text' | 'icebreaker' | 'reconnect';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  msgType: MsgType;
  createdAt: string;
}

export interface Icebreaker {
  id: string;
  matchId: string;
  topic: string;
  context: string | null;
  used: boolean;
  createdAt: string;
}

export type TriggerType = 'silence' | 'new_entry' | 'resonance';
export type TriggerStatus = 'pending' | 'sent' | 'dismissed';

export interface Trigger {
  id: string;
  matchId: string;
  toUser: string;
  triggerType: TriggerType;
  message: string;
  status: TriggerStatus;
  createdAt: string;
}

export interface GuideMsg {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

// ---- 接口响应组合类型 ----

export interface HealthRes {
  ok: boolean;
  aiMode: 'real' | 'mock';
}

export interface MeStats {
  entryCount: number;
  dimensionsCovered: string[];
  matchCount: number;
  pendingTriggers: number;
}

export interface MeRes {
  user: User;
  stats: MeStats;
}

export interface GuideSession {
  id: string;
  dimension: Dimension;
  status: string;
  turnCount: number;
}

export interface GuideStartRes {
  session: GuideSession;
  message: { role: 'assistant'; content: string };
}

export interface GuideMessageRes {
  reply: { role: 'assistant'; content: string };
  done: boolean;
  entry?: Entry;
}

export interface GuideActiveRes {
  session: GuideSession | null;
  messages: GuideMsg[];
}

export interface BookletRes {
  entries: Entry[];
  profile: {
    attitudeSummary: string | null;
    tags: AttitudeTag[];
  };
}

export interface Recommendation {
  user: User;
  score: number;
  reasons: string[];
  sharedDimensions: string[];
  previewEntries: Entry[];
}

export interface RecommendationsRes {
  needMoreEntries: boolean;
  recommendations: Recommendation[];
}

export interface MatchListItem {
  match: Match;
  otherUser: User;
  lastMessage: Message | null;
  silentMinutes: number | null;
}

export interface ChatRes {
  match: Match;
  otherUser: User;
  messages: Message[];
}

export interface SendMessageRes {
  message: Message;
  autoReply: Message | null;
}

export interface ReconnectTrigger extends Trigger {
  match: Match;
  otherUser: User;
}
