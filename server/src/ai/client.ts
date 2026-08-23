/**
 * OpenAI 兼容 chat/completions 客户端：原生 fetch，10s 超时 + 1 次重试。
 * 未配置 AI_API_KEY / AI_BASE_URL 时 aiMode='mock'，本模块不会被真正调用。
 */

import { config, aiMode } from '../config.js';

export { aiMode };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const TIMEOUT_MS = 10_000;

async function requestOnce(messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`AI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI 返回内容为空');
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** 调用真实 AI；失败重试 1 次；仍失败则抛错（由上层回落 Mock） */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  try {
    return await requestOnce(messages);
  } catch (err) {
    console.warn('[ai] 首次调用失败，重试一次:', (err as Error).message);
    return await requestOnce(messages);
  }
}
