# Astra

个人生产力 Web 应用：看板任务管理 + 番茄钟专注 + 数据统计。UI 参照 Apple Music Web 的扁平极简风格（毛玻璃播放条、大圆角、深色侧边栏）。

## 技术栈
- React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Zustand + @dnd-kit + react-router-dom
- 纯前端，数据持久化在浏览器 localStorage（键 `astra-db`）。`server/` 为留空壳，无后端 API。

## 快速开始
```bash
npm install
npm run dev
```
打开 http://localhost:5173

## 脚本
- `npm run dev` — 启动前端
- `npm test` — 运行客户端测试

## 目录结构
- `client/` — React SPA（端口 5173）
- `server/` — 空壳（未实现，预留）
