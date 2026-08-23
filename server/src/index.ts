import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db } from './db/connection.js';
import { getAiMode } from './ai/index.js';
import { authRouter, meRouter } from './routes/auth.js';
import { guideRouter } from './routes/guide.js';
import { bookletRouter } from './routes/booklet.js';
import { matchRouter } from './routes/match.js';
import { chatRouter } from './routes/chat.js';
import { reconnectRouter } from './routes/reconnect.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 认证中间件注入的当前用户 id */
      userId: string;
    }
  }
}

const app = express();
app.use(express.json());

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// 健康检查（免认证）
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiMode: getAiMode() });
});

// 认证路由（免认证）
app.use('/api/auth', authRouter);

// 401 中间件：其余 /api/* 均需有效 x-user-id
app.use('/api', (req, res, next) => {
  const userId = req.header('x-user-id');
  if (!userId) return res.status(401).json({ error: '缺少 x-user-id 请求头' });
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!exists) return res.status(401).json({ error: '无效的用户身份' });
  req.userId = userId;
  next();
});

app.use('/api', meRouter);
app.use('/api/guide', guideRouter);
app.use('/api/booklet', bookletRouter);
app.use('/api/match', matchRouter);
app.use('/api', chatRouter); // /api/chat/* 与 /api/icebreakers/:id/use
app.use('/api/reconnect', reconnectRouter);

// SPA fallback：非 API 请求返回 index.html（支持客户端路由）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// 404 与统一错误响应：非 2xx + {error}
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] 未捕获错误:', err);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  },
);

app.listen(config.port, () => {
  console.log(`[server] 人生 Attitude 册子 API 已启动 http://localhost:${config.port}`);
  console.log(`[server] aiMode = ${getAiMode()}`);
});
