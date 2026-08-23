import { getStoredUser } from '../store/session';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  // 除 /api/health 与 /api/auth/* 外，所有请求注入 x-user-id
  const isPublic = path === '/health' || path.startsWith('/auth/');
  if (!isPublic) {
    const user = getStoredUser();
    if (user) headers['x-user-id'] = user.id;
  }
  const res = await fetch(`/api${path}`, { ...options, headers });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // 非 JSON 响应体
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `请求失败（${res.status}）`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
