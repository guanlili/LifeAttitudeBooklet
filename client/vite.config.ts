import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 仅声明 config 文件需要的 Node 全局，避免引入 @types/node
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:' + (process.env.API_PORT || '3000'),
    },
  },
});
