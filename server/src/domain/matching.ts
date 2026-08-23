/**
 * 确定性匹配计分（纯函数，不依赖 DB / AI）。
 * score = 0.6×加权Jaccard(立场集，权重按 depthLevel/3) + 0.3×维度Jaccard + 0.1×min(1, 对方条目数/5)
 */

import { DIMENSION_LABELS, type Dimension } from './dimensions.js';
import type { AttitudeTag } from '../db/connection.js';

export interface EntryLike {
  dimension: string;
  stance: string;
  /** 1-3 表达深度；缺省按 2 */
  depthLevel?: number;
}

export interface MatchScore {
  score: number;
  sharedDimensions: string[];
  /** 双方一致的 "dimension:stance" */
  sharedStances: string[];
  /** 同维度但立场不同：[dimension, stanceA, stanceB] */
  contrasts: Array<[string, string, string]>;
}

/** 立场权重：key="dimension:stance"，w=该 key 下条目 max(depthLevel)/3（范围 1/3~1） */
function stanceWeights(entries: EntryLike[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.dimension}:${e.stance}`;
    const w = (e.depthLevel ?? 2) / 3;
    weights.set(key, Math.max(weights.get(key) ?? 0, w));
  }
  return weights;
}

function dimSet(entries: EntryLike[]): Set<string> {
  return new Set(entries.map((e) => e.dimension));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** 加权 Jaccard：Σ_union min(wA,wB) / Σ_union max(wA,wB)，一边不存在按 0；空∪空返回 0 */
function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  let num = 0;
  let den = 0;
  for (const k of keys) {
    num += Math.min(a.get(k) ?? 0, b.get(k) ?? 0);
    den += Math.max(a.get(k) ?? 0, b.get(k) ?? 0);
  }
  return den === 0 ? 0 : num / den;
}

export function scoreMatch(mine: EntryLike[], theirs: EntryLike[]): MatchScore {
  const wa = stanceWeights(mine);
  const wb = stanceWeights(theirs);
  const da = dimSet(mine);
  const db_ = dimSet(theirs);

  const sharedDimensions = [...da].filter((d) => db_.has(d));
  const sharedStances = [...wa.keys()].filter((s) => wb.has(s));

  // 同维度不同立场 → 反差（用于破冰话题）
  const contrasts: Array<[string, string, string]> = [];
  for (const d of sharedDimensions) {
    const mineStances = mine.filter((e) => e.dimension === d).map((e) => e.stance);
    const theirStances = theirs.filter((e) => e.dimension === d).map((e) => e.stance);
    for (const ms of mineStances) {
      for (const ts of theirStances) {
        if (ms !== ts) contrasts.push([d, ms, ts]);
      }
    }
  }

  const raw =
    0.6 * weightedJaccard(wa, wb) +
    0.3 * jaccard(da, db_) +
    0.1 * Math.min(1, theirs.length / 5);

  return {
    score: Math.round(raw * 100) / 100,
    sharedDimensions,
    sharedStances,
    contrasts,
  };
}

const dimLabel = (d: string): string =>
  DIMENSION_LABELS[d as Dimension] ?? d;

const short = (stance: string): string => stance.replace(/型$/, '');

/** 确定性匹配理由（推荐列表使用；connect 时可被 AI 版本替换） */
export function buildReasons(result: MatchScore, theirEntryCount: number): string[] {
  const reasons: string[] = [];
  for (const s of result.sharedStances.slice(0, 2)) {
    const [d, stance] = s.split(':');
    reasons.push(`你们在「${dimLabel(d)}」上都偏向${short(stance)}`);
  }
  const contrastDims = result.contrasts.slice(0, 1);
  for (const [d, a, b] of contrastDims) {
    reasons.push(`在「${dimLabel(d)}」上，${short(a)}遇上${short(b)}，是有张力的互补`);
  }
  if (reasons.length < 2 && result.sharedDimensions.length > 0) {
    const dims = result.sharedDimensions.map(dimLabel).join('、');
    reasons.push(`你们都认真思考过「${dims}」这些人生课题`);
  }
  if (reasons.length === 0) {
    reasons.push(`对方的册子里有 ${theirEntryCount} 段真诚的人生故事，值得一读`);
  }
  return reasons.slice(0, 3);
}

/** 画像标签聚合：count 按 Σ(depthLevel/3) 累加，weight 按 max 归一（条目增删后重算） */
export function aggregateTags(entries: EntryLike[]): AttitudeTag[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.dimension}:${e.stance}`;
    counts.set(key, (counts.get(key) ?? 0) + (e.depthLevel ?? 2) / 3);
  }
  const max = Math.max(1e-9, ...counts.values());
  return [...counts.entries()]
    .map(([key, count]) => {
      const [dimension, stance] = key.split(':');
      return {
        dimension,
        stance,
        label: short(stance),
        weight: Math.round((count / max) * 100) / 100,
      };
    })
    .sort((a, b) => b.weight - a.weight);
}
