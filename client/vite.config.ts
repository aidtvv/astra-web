import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // 部署到 https://aidtvv.github.io/astra-web/ 时使用 /astra-web/，本地开发保持根路径
    base: env.VITE_BASE || '/',
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
  };
});
