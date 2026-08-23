/**
 * 7 个场景的中文 Prompt 模板（system + user 构造函数）。
 * 语气：温暖、真诚、不油腻、不娱乐化；输出一律要求 JSON；立场必须取自词表。
 */

import {
  DIMENSION_LABELS,
  STANCES,
  type Dimension,
} from '../domain/dimensions.js';
import type { GuideMsg } from '../db/connection.js';

export interface PromptPair {
  system: string;
  user: string;
}

const BASE_TONE =
  '你是「人生 Attitude 册子」的引导者，服务 18-35 岁追求长期真诚关系的人。' +
  '语气温暖真诚、克制不油腻、不娱乐化、不评判。只输出 JSON，不要输出任何 JSON 之外的文字。';

const stanceList = (d: Dimension) => STANCES[d].join('、');

const historyText = (messages: GuideMsg[]): string =>
  messages
    .map((m) => `${m.role === 'user' ? '用户' : '引导者'}：${m.content}`)
    .join('\n');

/** 场景1：引导开场（探讨性小故事 + 第一问） */
export function guideOpen(dimension: Dimension): PromptPair {
  const label = DIMENSION_LABELS[dimension];
  return {
    system:
      BASE_TONE +
      `\n任务：围绕「${label}」维度，讲一个 60-120 字、真实生活化、有探讨性的小故事（如朋友经历、常见两难），` +
      '然后提出第一个开放式问题（不超过 50 字，一次只问一个问题）。故事与问题写在同一个 content 里。' +
      '\n输出 JSON：{"content":"故事+问题"}',
    user: `请为「${label}」生成开场故事与第一问。`,
  };
}

/** 场景2：引导追问（每轮仅 1 个 ≤50 字问题） */
export function guideNext(dimension: Dimension, messages: GuideMsg[]): PromptPair {
  const label = DIMENSION_LABELS[dimension];
  return {
    system:
      BASE_TONE +
      `\n任务：你正在围绕「${label}」渐进式引导用户表达人生态度。先用一句简短共情回应用户上一条回复，` +
      '再追问一个更深入的问题。问题不超过 50 字，每轮只能问一个问题，不给建议、不代替用户总结。' +
      '\n输出 JSON：{"content":"共情+追问"}',
    user: `以下是对话记录：\n${historyText(messages)}\n\n请生成下一轮回应。`,
  };
}

/** 场景3：从会话提取册子条目 */
export function extractEntry(dimension: Dimension, messages: GuideMsg[]): PromptPair {
  const label = DIMENSION_LABELS[dimension];
  return {
    system:
      BASE_TONE +
      `\n任务：根据引导对话，为用户沉淀一条「${label}」维度的册子条目。要求：` +
      '\n- title：15 字以内、有温度的标题' +
      '\n- story：以第一人称改写用户讲述的真实故事（100-200 字，忠于原意，不虚构）' +
      '\n- attitude：1-2 句凝练的态度句' +
      `\n- stance：必须从词表中选一个：${stanceList(dimension)}` +
      '\n- tags：2-4 个短标签' +
      '\n- depthLevel：1-3（表达深度）' +
      '\n提炼规则：' +
      '\n1. 忠于用户原话，不虚构未提及的事实与情节；' +
      '\n2. attitude 必须是用户自己的判断与选择，不是对故事的复述；' +
      '\n3. stance 只选最主要的一个，多重倾向时选用户反复强调的那个；' +
      '\n4. tags 优先使用用户原词，其次才做概括；' +
      '\n5. 宁可保守：证据不足时选更低的 depthLevel、更笼统的 tags，不过度解读。' +
      '\ndepthLevel 判据：1=随口一提或纯事实陈述；2=明确表态且有个人判断；3=有真实经历支撑、立场强烈或反复强调。' +
      '\n示例（对话片段 → 输出，示例为亲密关系维度、仅示范格式）：' +
      '\n用户：「我跟前任最大的问题就是有话不说。现在我宁可吵一架也要把话摊开，憋着才伤感情，这是我用一段关系换来的教训。」' +
      '\n输出：{"title":"有话摊开说","story":"我经历过一段有话不说的关系……现在的我宁可当场吵一架，也要把话摊开说清楚。","attitude":"憋着才伤感情，坦诚地把话说开，是我用一段关系换来的答案。","stance":"坦诚沟通型","tags":["坦诚","摊开说"],"depthLevel":3}' +
      '\n输出 JSON：{"title":"","story":"","attitude":"","stance":"","tags":[],"depthLevel":1}',
    user: `对话记录：\n${historyText(messages)}\n\n请提取条目。`,
  };
}

/** 场景4：刷新用户画像总结 */
export function refreshProfile(
  nickname: string,
  entries: Array<{ dimension: string; stance: string; attitude: string }>,
): PromptPair {
  const lines = entries
    .map(
      (e) =>
        `- [${DIMENSION_LABELS[e.dimension as Dimension] ?? e.dimension}] ${e.stance}：${e.attitude}`,
    )
    .join('\n');
  return {
    system:
      BASE_TONE +
      '\n任务：根据用户册子条目，用第三人称写一段 40-80 字的人生态度画像总结，真诚具体、不堆砌形容词。' +
      '\n输出 JSON：{"summary":""}',
    user: `用户「${nickname}」的册子条目：\n${lines}\n\n请生成画像总结。`,
  };
}

/** 场景5：匹配理由 */
export function matchReasons(
  nicknameA: string,
  nicknameB: string,
  sharedStances: string[],
  contrasts: Array<[string, string, string]>,
): PromptPair {
  const sharedText = sharedStances
    .map((s) => {
      const [d, st] = s.split(':');
      return `同「${DIMENSION_LABELS[d as Dimension] ?? d}」立场：${st}`;
    })
    .join('；');
  const contrastText = contrasts
    .map(([d, a, b]) => `「${DIMENSION_LABELS[d as Dimension] ?? d}」上 ${a} vs ${b}`)
    .join('；');
  return {
    system:
      BASE_TONE +
      '\n任务：为两位用户生成 2-3 条匹配理由，每条 30 字以内，基于立场共鸣或有张力的互补，不夸张、不泄露对方故事细节。' +
      '\n输出 JSON：{"reasons":["",""]}',
    user:
      `用户A「${nicknameA}」与用户B「${nicknameB}」。` +
      `\n共同立场：${sharedText || '无'}\n立场反差：${contrastText || '无'}\n\n请生成匹配理由。`,
  };
}

/** 场景6：破冰话题（恰 3 条） */
export function genIcebreakers(
  nicknameA: string,
  nicknameB: string,
  tagsA: string[],
  tagsB: string[],
): PromptPair {
  return {
    system:
      BASE_TONE +
      '\n任务：为两位刚匹配的用户生成恰好 3 个破冰话题。要求：有探讨价值、基于双方立场的交集或反差、' +
      '绝对不泄露任何一方册子里故事的原文细节；每条 topic 40 字以内，context 一句话说明出题依据。' +
      '\n输出 JSON：{"topics":[{"topic":"","context":""},{"topic":"","context":""},{"topic":"","context":""}]}',
    user:
      `用户A「${nicknameA}」的立场标签：${tagsA.join('、') || '暂无'}` +
      `\n用户B「${nicknameB}」的立场标签：${tagsB.join('、') || '暂无'}\n\n请生成 3 个破冰话题。`,
  };
}

/** 场景7：长联触达消息 */
export function genReconnect(
  triggerType: 'silence' | 'new_entry' | 'resonance',
  otherNickname: string,
  dimensionLabel: string,
): PromptPair {
  const sceneDesc: Record<string, string> = {
    silence: '两人有过真诚对话但已沉默一段时间，帮助发起自然不尴尬的重新联系',
    new_entry: `对方在「${dimensionLabel}」维度写了新的册子条目，以此为由头重启对话`,
    resonance: `双方在「${dimensionLabel}」维度立场相近，以共鸣为由头重启对话`,
  };
  return {
    system:
      BASE_TONE +
      `\n任务：代拟一条重新联系的消息（用户会以自己的名义发送）。场景：${sceneDesc[triggerType]}。` +
      '要求：60 字以内、自然真诚、不卑微不油腻、给对方一个容易接的话头，不泄露故事原文细节。' +
      '\n输出 JSON：{"message":""}',
    user: `对方昵称：「${otherNickname}」。请生成这条消息。`,
  };
}
