/**
 * 7 个场景的确定性 Mock 实现：基于 dimensions.ts 的故事库/立场词表/话题模板。
 * 无 AI 配置时全量接管；真实 AI 解析失败时回落到这里。
 */

import {
  ACK_PHRASES,
  CLOSING_MESSAGES,
  DEEP_QUESTIONS,
  DIMENSION_LABELS,
  GUIDE_STORIES,
  ICEBREAKER_TEMPLATES,
  RECONNECT_TEMPLATES,
  SEED_REPLY_TEMPLATES,
  STANCES,
  type Dimension,
} from '../domain/dimensions.js';
import { buildKeywordMap, STANCE_POOL } from '../domain/stance-pool.js';
import type { AttitudeTag, GuideMsg } from '../db/connection.js';
import type { MatchScore } from '../domain/matching.js';
import { buildReasons } from '../domain/matching.js';

const short = (stance: string): string => stance.replace(/型$/, '');
const dimLabel = (d: string): string => DIMENSION_LABELS[d as Dimension] ?? d;

/** 简单字符串哈希：让同一会话固定使用同一组故事 */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const userReplies = (messages: GuideMsg[]): string[] =>
  messages.filter((m) => m.role === 'user').map((m) => m.content.trim());

/** 有效回复：≥5 个字符才算一轮 */
export const effectiveReplies = (messages: GuideMsg[]): string[] =>
  userReplies(messages).filter((c) => c.length >= 5);

// ---------- 场景1：引导开场 ----------

export function guideOpen(dimension: Dimension, sessionId: string): { content: string } {
  const stories = GUIDE_STORIES[dimension];
  const s = stories[hashStr(sessionId) % stories.length];
  return { content: `${s.story}\n\n${s.openQuestion}` };
}

// ---------- 场景2：引导追问 ----------

export function guideNext(
  dimension: Dimension,
  sessionId: string,
  messages: GuideMsg[],
): { content: string } {
  const replies = userReplies(messages);
  const last = replies[replies.length - 1] ?? '';
  if (last.length < 5) {
    return { content: '不着急，可以再多说一点吗？哪怕只是当时脑子里闪过的一个念头。' };
  }
  const stories = GUIDE_STORIES[dimension];
  const story = stories[hashStr(sessionId) % stories.length];
  const bank = [...story.followUps, ...DEEP_QUESTIONS[dimension]];
  const idx = Math.min(effectiveReplies(messages).length - 1, bank.length - 1);
  const ack = ACK_PHRASES[idx % ACK_PHRASES.length];
  return { content: `${ack}${bank[Math.max(0, idx)]}` };
}

/** 收尾语（done 时的 assistant 回复） */
export function closingMessage(sessionId: string): string {
  return CLOSING_MESSAGES[hashStr(sessionId) % CLOSING_MESSAGES.length];
}

// ---------- 场景3：提取册子条目 ----------

/** 立场关键词映射：从用户消息推断立场，命不中则取词表首位；由 STANCE_POOL 派生 */
const STANCE_KEYWORDS: Record<Dimension, Record<string, string[]>> = buildKeywordMap(STANCE_POOL);

export interface ExtractedEntry {
  title: string;
  story: string;
  attitude: string;
  stance: string;
  tags: string[];
  depthLevel: number;
}

export function extractEntry(dimension: Dimension, messages: GuideMsg[]): ExtractedEntry {
  const replies = effectiveReplies(messages);
  const text = replies.join(' ');
  const label = dimLabel(dimension);

  // 关键词计分选立场
  let stance = STANCES[dimension][0];
  let bestHits = 0;
  const matchedKeywords: string[] = [];
  for (const [st, keywords] of Object.entries(STANCE_KEYWORDS[dimension])) {
    const hits = keywords.filter((k) => text.includes(k));
    if (hits.length > bestHits) {
      bestHits = hits.length;
      stance = st;
      matchedKeywords.splice(0, matchedKeywords.length, ...hits);
    }
  }

  const t = short(stance);
  const story = replies.join('。').replace(/。。/g, '。').slice(0, 200);
  const depthLevel = replies.length >= 5 ? 3 : replies.length >= 3 ? 2 : 1;
  const tags = [...new Set([t, label, ...matchedKeywords.slice(0, 2)])].slice(0, 4);

  return {
    title: `${label}：我选择${t}`,
    story: story || `我认真聊了聊自己对${label}的看法。`,
    attitude: `在${label}这件事上，我更认同「${t}」的方式——这是我在真实经历里确认过的答案。`,
    stance,
    tags,
    depthLevel,
  };
}

// ---------- 场景4：画像总结 ----------

export function refreshProfile(
  nickname: string,
  entries: Array<{ dimension: string; stance: string }>,
): { summary: string | null } {
  if (entries.length === 0) return { summary: null };
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const e of entries) {
    const key = `${e.dimension}:${e.stance}`;
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(`${dimLabel(e.dimension)}上偏向${short(e.stance)}`);
    if (phrases.length >= 4) break;
  }
  const dims = [...new Set(entries.map((e) => dimLabel(e.dimension)))].join('、');
  return {
    summary: `在${dims}这些人生课题上，${nickname}有自己认真想过的答案：${phrases.join('，')}。`,
  };
}

// ---------- 场景5：匹配理由 ----------

export function matchReasons(result: MatchScore, theirEntryCount: number): { reasons: string[] } {
  return { reasons: buildReasons(result, theirEntryCount) };
}

// ---------- 场景6：破冰话题 ----------

export interface IcebreakerTopic {
  topic: string;
  context: string;
}

const fill = (tpl: string, vars: Record<string, string>): string =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export function genIcebreakers(
  result: MatchScore,
  allDims: string[],
  offset: number,
): IcebreakerTopic[] {
  const candidates: IcebreakerTopic[] = [];

  for (const s of result.sharedStances) {
    const [d, stance] = s.split(':');
    for (const tpl of ICEBREAKER_TEMPLATES.shared) {
      candidates.push({
        topic: fill(tpl, { dim: dimLabel(d), stance: short(stance) }),
        context: `基于你们在「${dimLabel(d)}」上的共同立场`,
      });
    }
  }
  for (const [d, a, b] of result.contrasts) {
    for (const tpl of ICEBREAKER_TEMPLATES.contrast) {
      candidates.push({
        topic: fill(tpl, { dim: dimLabel(d), stanceA: short(a), stanceB: short(b) }),
        context: `基于你们在「${dimLabel(d)}」上的立场反差`,
      });
    }
  }
  const dims = allDims.length > 0 ? allDims : ['love'];
  for (const d of dims) {
    for (const tpl of ICEBREAKER_TEMPLATES.generic) {
      candidates.push({
        topic: fill(tpl, { dim: dimLabel(d) }),
        context: `围绕你们都在乎的「${dimLabel(d)}」话题`,
      });
    }
  }

  // 交错取样：优先覆盖 共鸣/反差/通用 三种来源，offset 用于刷新时换一批
  const picked: IcebreakerTopic[] = [];
  const seen = new Set<string>();
  for (let i = 0; picked.length < 3 && i < candidates.length * 2; i++) {
    const c = candidates[(offset + i * 4) % candidates.length];
    if (seen.has(c.topic)) continue;
    seen.add(c.topic);
    picked.push(c);
  }
  return picked;
}

// ---------- 场景7：长联触达 ----------

export function genReconnect(
  triggerType: 'silence' | 'new_entry' | 'resonance',
  dimensionLabel: string,
  seed: string,
): { message: string } {
  const bank = RECONNECT_TEMPLATES[triggerType];
  const tpl = bank[hashStr(seed) % bank.length];
  return { message: fill(tpl, { dim: dimensionLabel }) };
}

// ---------- 附加：种子用户 persona 自动回复（业务规则 4） ----------

export function seedReply(
  seedNickname: string,
  seedTags: AttitudeTag[],
  incoming: string,
): string {
  const top = seedTags[0];
  const tagPhrase = top
    ? `我自己在${dimLabel(top.dimension)}上也是偏${top.label}的人`
    : `我也一直在想类似的问题`;
  const tpl = SEED_REPLY_TEMPLATES[hashStr(seedNickname + incoming) % SEED_REPLY_TEMPLATES.length];
  return fill(tpl, { tag: tagPhrase });
}
