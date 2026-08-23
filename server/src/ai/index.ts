/**
 * AI 场景分发层：按 aiMode 走真实 AI 或 Mock；真实 AI 解析/校验失败时回落 Mock。
 * 暴露 7 个场景函数：guideOpen / guideNext / extractEntry / refreshProfile /
 * matchReasons / genIcebreakers / genReconnect（另附 seedReply 用于种子自动回复）。
 */

import { aiMode, chatCompletion, type ChatMessage } from './client.js';
import { parseJson } from './parser.js';
import * as prompts from './prompts.js';
import * as mock from './mock.js';
import { STANCES, DIMENSION_LABELS, type Dimension } from '../domain/dimensions.js';
import type { AttitudeTag, GuideMsg } from '../db/connection.js';
import type { MatchScore } from '../domain/matching.js';

export { effectiveReplies, closingMessage, seedReply } from './mock.js';
export type { ExtractedEntry, IcebreakerTopic } from './mock.js';

export const getAiMode = (): 'real' | 'mock' => aiMode;

/** 真实 AI 调用 + JSON 解析；任何异常返回 null 交由调用方回落 Mock */
async function callReal<T extends object>(pair: prompts.PromptPair): Promise<T | null> {
  if (aiMode !== 'real') return null;
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: pair.system },
      { role: 'user', content: pair.user },
    ];
    const text = await chatCompletion(messages);
    return parseJson<T>(text);
  } catch (err) {
    console.warn('[ai] 真实 AI 调用失败，回落 mock:', (err as Error).message);
    return null;
  }
}

// ---------- 场景1：引导开场 ----------

export async function guideOpen(
  dimension: Dimension,
  sessionId: string,
): Promise<{ content: string }> {
  const real = await callReal<{ content?: string }>(prompts.guideOpen(dimension));
  if (real?.content && typeof real.content === 'string') {
    return { content: real.content };
  }
  return mock.guideOpen(dimension, sessionId);
}

// ---------- 场景2：引导追问 ----------

export async function guideNext(
  dimension: Dimension,
  sessionId: string,
  messages: GuideMsg[],
): Promise<{ content: string }> {
  const real = await callReal<{ content?: string }>(prompts.guideNext(dimension, messages));
  if (real?.content && typeof real.content === 'string') {
    return { content: real.content };
  }
  return mock.guideNext(dimension, sessionId, messages);
}

// ---------- 场景3：提取册子条目 ----------

export async function extractEntry(
  dimension: Dimension,
  messages: GuideMsg[],
): Promise<mock.ExtractedEntry> {
  const fallback = mock.extractEntry(dimension, messages);
  const real = await callReal<Partial<mock.ExtractedEntry>>(
    prompts.extractEntry(dimension, messages),
  );
  if (!real || typeof real.story !== 'string' || typeof real.stance !== 'string') {
    return fallback;
  }
  // stance 必须在词表内，否则整体回落（避免脏立场污染匹配）
  if (!STANCES[dimension].includes(real.stance)) return fallback;
  return {
    title: typeof real.title === 'string' && real.title ? real.title : fallback.title,
    story: real.story,
    attitude:
      typeof real.attitude === 'string' && real.attitude ? real.attitude : fallback.attitude,
    stance: real.stance,
    tags: Array.isArray(real.tags) && real.tags.length > 0
      ? real.tags.filter((t): t is string => typeof t === 'string').slice(0, 4)
      : fallback.tags,
    depthLevel:
      typeof real.depthLevel === 'number' && real.depthLevel >= 1 && real.depthLevel <= 3
        ? Math.round(real.depthLevel)
        : fallback.depthLevel,
  };
}

// ---------- 场景4：画像总结 ----------

export async function refreshProfile(
  nickname: string,
  entries: Array<{ dimension: string; stance: string; attitude: string }>,
): Promise<{ summary: string | null }> {
  if (entries.length === 0) return { summary: null };
  const real = await callReal<{ summary?: string }>(prompts.refreshProfile(nickname, entries));
  if (real?.summary && typeof real.summary === 'string') {
    return { summary: real.summary };
  }
  return mock.refreshProfile(nickname, entries);
}

// ---------- 场景5：匹配理由 ----------

export async function matchReasons(
  nicknameA: string,
  nicknameB: string,
  result: MatchScore,
  theirEntryCount: number,
): Promise<{ reasons: string[] }> {
  const real = await callReal<{ reasons?: unknown }>(
    prompts.matchReasons(nicknameA, nicknameB, result.sharedStances, result.contrasts),
  );
  if (real && Array.isArray(real.reasons)) {
    const reasons = real.reasons.filter((r): r is string => typeof r === 'string' && !!r);
    if (reasons.length > 0) return { reasons: reasons.slice(0, 3) };
  }
  return mock.matchReasons(result, theirEntryCount);
}

// ---------- 场景6：破冰话题（恰 3 条） ----------

export async function genIcebreakers(
  nicknameA: string,
  nicknameB: string,
  tagsA: AttitudeTag[],
  tagsB: AttitudeTag[],
  result: MatchScore,
  allDims: string[],
  offset: number,
): Promise<mock.IcebreakerTopic[]> {
  const real = await callReal<{ topics?: unknown }>(
    prompts.genIcebreakers(
      nicknameA,
      nicknameB,
      tagsA.map((t) => `${DIMENSION_LABELS[t.dimension as Dimension] ?? t.dimension}·${t.label}`),
      tagsB.map((t) => `${DIMENSION_LABELS[t.dimension as Dimension] ?? t.dimension}·${t.label}`),
    ),
  );
  if (real && Array.isArray(real.topics)) {
    const topics = real.topics
      .filter((t: any) => t && typeof t.topic === 'string' && t.topic)
      .map((t: any) => ({
        topic: t.topic as string,
        context: typeof t.context === 'string' ? t.context : '基于你们的册子生成',
      }));
    if (topics.length >= 3) return topics.slice(0, 3);
  }
  return mock.genIcebreakers(result, allDims, offset);
}

// ---------- 场景7：长联触达 ----------

export async function genReconnect(
  triggerType: 'silence' | 'new_entry' | 'resonance',
  otherNickname: string,
  dimension: string,
  seed: string,
): Promise<{ message: string }> {
  const label = DIMENSION_LABELS[dimension as Dimension] ?? dimension;
  const real = await callReal<{ message?: string }>(
    prompts.genReconnect(triggerType, otherNickname, label),
  );
  if (real?.message && typeof real.message === 'string') {
    return { message: real.message };
  }
  return mock.genReconnect(triggerType, label, seed);
}
