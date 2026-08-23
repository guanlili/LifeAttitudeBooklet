import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 优先加载仓库根目录 .env（server 目录内运行时），再兼容 server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/** 解析正数环境变量；非法（NaN/非正）时回退默认值 */
function positiveNumber(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  port: positiveNumber(process.env.PORT, 3000),
  aiBaseUrl: (process.env.AI_BASE_URL || '').trim().replace(/\/+$/, ''),
  aiApiKey: (process.env.AI_API_KEY || '').trim(),
  aiModel: (process.env.AI_MODEL || 'gpt-4o-mini').trim(),
  reconnectSilentMinutes: positiveNumber(process.env.RECONNECT_SILENT_MINUTES, 1),
};

/** 未配置 AI_BASE_URL 或 AI_API_KEY 时进入 mock 模式 */
export const aiMode: 'real' | 'mock' =
  config.aiBaseUrl && config.aiApiKey ? 'real' : 'mock';
