import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 部署到 https://aidtvv.github.io/astra-web/ 时由 deploy.ps1 设置 VITE_BASE='/astra-web/'，
  // 本地开发保持根路径，避免 dev server 前缀问题。
  base: process.env.VITE_BASE || '/',
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
