/**
 * 5 级 JSON 解析链：直接 parse → ```json fence 提取 → 首{尾}截取 → 关键字段正则 → null
 * 真实 AI 输出常带解释文字或代码块，逐级降级解析。
 */

function tryParse<T>(text: string): T | null {
  try {
    const v = JSON.parse(text);
    return typeof v === 'object' && v !== null ? (v as T) : null;
  } catch {
    return null;
  }
}

export function parseJson<T extends object>(text: string | null | undefined): T | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. 直接 parse
  const direct = tryParse<T>(trimmed);
  if (direct) return direct;

  // 2. ```json fence 提取
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const fenced = tryParse<T>(fence[1].trim());
    if (fenced) return fenced;
  }

  // 3. 首 { 尾 } 截取（兼容首 [ 尾 ]）
  for (const [open, close] of [
    ['{', '}'],
    ['[', ']'],
  ] as const) {
    const start = trimmed.indexOf(open);
    const end = trimmed.lastIndexOf(close);
    if (start !== -1 && end > start) {
      const sliced = tryParse<T>(trimmed.slice(start, end + 1));
      if (sliced) return sliced;
    }
  }

  // 4. 关键字段正则（仅能恢复字符串/数字字段）
  const obj: Record<string, unknown> = {};
  const kvRe = /"([A-Za-z_][\w]*)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?))/g;
  let m: RegExpExecArray | null;
  while ((m = kvRe.exec(trimmed)) !== null) {
    const key = m[1];
    if (obj[key] !== undefined) continue;
    obj[key] =
      m[2] !== undefined
        ? m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n')
        : Number(m[3]);
  }
  if (Object.keys(obj).length > 0) return obj as T;

  // 5. 放弃
  return null;
}
