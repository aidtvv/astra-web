import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Actions 构建时部署到 https://aidtvv.github.io/astra-web/，资源走子路径；
  // 本地开发保持根路径，避免 dev server 前缀问题。
  base: process.env.GITHUB_ACTIONS ? '/astra-web/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://todo.i99yun.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
