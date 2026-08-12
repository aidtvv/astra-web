# Astra — Web 应用设计文档

日期：2026-08-12
状态：已批准

## 1. 项目概述

**Astra** 是一个个人生产力 Web 应用，融合看板任务管理、番茄钟专注计时与数据统计，UI 参照 Apple Music Web 版的扁平极简风格（毛玻璃、大圆角、卡片网格、深色侧边栏）。

三个核心模块：
1. **看板（Kanban）** — 任务 CRUD + 拖拽
2. **专注计时（Focus/Pomodoro）** — 三种模式 + 会话记录 + 任务关联
3. **统计（Stats）** — 30 天热力图 + 汇总 KPI

## 2. 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Zustand + @dnd-kit + react-router-dom |
| 后端 | Node.js + Express + better-sqlite3 (SQLite) |
| 端口 | 前端 5173，后端 3001，Vite proxy `/api` → `localhost:3001` |

**已确认决策**：
- 拖拽库：`@dnd-kit`（支持跨列与排序）
- 导航：`react-router-dom`（NavLink 匹配选中态）
- 界面文案：中文
- 首次运行：空数据开始（仅 4 个默认空列）

## 3. 目录结构

```
D:\CheckBox\Astra\
├── package.json            # 根：concurrently 一键启动
├── docs/superpowers/       # 设计文档 + 实施计划
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # Express 入口
│       ├── db.ts           # better-sqlite3 初始化 + schema + 种子列
│       ├── types.ts
│       └── routes/
│           ├── columns.ts
│           ├── tasks.ts
│           ├── focus.ts
│           └── stats.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts      # proxy /api → 3001
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx        # Router + Providers
        ├── App.tsx         # 布局：Sidebar + 内容 + PlayerBar
        ├── index.css       # Tailwind + 字体 + 全局样式
        ├── store/index.ts  # Zustand 全局状态
        ├── services/api.ts # fetch 封装
        ├── types/index.ts
        ├── components/
        │   ├── Sidebar.tsx
        │   ├── PlayerBar.tsx
        │   ├── SearchBar.tsx
        │   ├── TaskCard.tsx
        │   ├── TaskModal.tsx
        │   └── FocusTimer.tsx
        └── pages/
            ├── KanbanPage.tsx
            ├── FocusPage.tsx
            └── StatsPage.tsx
```

## 4. 数据模型（SQLite）

```sql
CREATE TABLE columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '📌',
  accentColor TEXT NOT NULL DEFAULT '#fa2d48'
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  columnId INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium',   -- high | medium | low
  pomodoroMinutes INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  dueDate TEXT,                              -- ISO date 或 null
  completedAt TEXT,                          -- ISO datetime 或 null
  createdAt TEXT NOT NULL
);

CREATE TABLE pomodoro_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER,                            -- 关联任务，自由模式为 NULL
  taskTitle TEXT DEFAULT '',                 -- 任务标题快照
  duration INTEGER NOT NULL DEFAULT 0,       -- 分钟（完成时才写入）
  completed INTEGER NOT NULL DEFAULT 0,      -- 0/1
  startedAt TEXT NOT NULL,
  finishedAt TEXT,
  mode TEXT NOT NULL                         -- focus | break | free
);

CREATE TABLE daily_activities (
  date TEXT PRIMARY KEY,                     -- YYYY-MM-DD
  minutes INTEGER NOT NULL DEFAULT 0
);
```

**规则**：
- 启动时若 `columns` 为空，插入默认列：📋待办 / 🚀进行中 / 🔍待审核 / ✅已完成
- 删除任务 → 级联删除其 `pomodoro_sessions`；`daily_activities` 保留（统计归历史）
- `daily_activities` 仅在会话结束时写入/累加（completed = 1）

## 5. 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/api/columns` | 列管理（删除列时其下任务级联删除，由 `ON DELETE CASCADE` 保证） |
| GET/POST/PUT/DELETE | `/api/tasks` | 任务 CRUD，PUT 支持 `{ columnId, order }` 用于拖拽落位 |
| POST | `/api/focus/start` | body `{ mode, taskId?, taskTitle? }` → 创建会话返回 `{ id, startedAt }` |
| POST | `/api/focus/end` | body `{ id, duration, completed }` → 写时长、累加任务 `pomodoroMinutes`、更新 `daily_activities` |
| GET | `/api/focus/sessions` | 最近会话列表（按 startedAt 倒序，limit 50） |
| GET | `/api/stats/daily?days=30` | 按日聚合分钟 → `[{ date, minutes }]` |
| GET | `/api/stats/summary` | `{ totalMinutes, totalSessions, streakDays, todayMinutes }` |

**GET /api/stats/summary 语义**：
- `totalMinutes`：全部已完成为 `completed=1` 的会话分钟总和
- `totalSessions`：`completed=1` 的会话数
- `streakDays`：从今天起（若今天为 0 则从昨天起）向前连续 `daily_activities.minutes > 0` 的天数
- `todayMinutes`：今天 `daily_activities.minutes`

## 6. 前端架构

### 6.1 路由

```
/         → KanbanPage
/focus    → FocusPage
/stats    → StatsPage
```

### 6.2 Zustand 全局状态（store/index.ts）

```ts
{
  columns: Column[],
  tasks: Task[],
  sessions: Session[],
  stats: { daily: DailyStat[], summary: Summary },
  // 计时器
  timer: {
    status: 'idle' | 'running' | 'paused',
    mode: 'focus' | 'break' | 'free',
    totalSeconds: number,
    remainingSeconds: number,
    taskId: number | null,
    sessionId: number | null,
  },
  // actions
  loadAll(), loadStats(),
  addTask/updateTask/deleteTask/moveTask,
  addColumn/updateColumn/deleteColumn,
  startTimer(mode, taskId?), pauseTimer(), resumeTimer(), endTimer(completed),
  tick(),  // 每秒递减
}
```

### 6.3 服务层（services/api.ts）

`fetch` 封装，统一 `/api` 前缀（Vite proxy 转发到 3001），错误抛 `Error`，请求/响应 JSON。

### 6.4 计时器数据流

1. 用户点「一键专注」→ `POST /api/focus/start` 创建会话 → Zustand `timer` 置为 running
2. `tick()` 每秒递减 `remainingSeconds`
3. 结束（自然结束或手动）→ `POST /api/focus/end { id, duration, completed }`
4. 完成后刷新 `tasks` + `stats`（任务 `pomodoroMinutes` 已累加）

## 7. UI 设计系统

### 7.1 色彩

| Token | 值 | 用途 |
|-------|-----|------|
| bg | `#f5f5f7` | 主背景（浅灰） |
| surface | `#ffffff` | 卡片/弹窗 |
| primary | `#fa2d48` | 品红主题色（按钮、选中态、强调） |
| sidebar-bg | `#1d1d1f` | 深色侧边栏 |
| text-primary | `#1d1d1f` | 主文字 |
| text-secondary | `#86868b` | 次要文字 |
| success/warn/error | 绿/橙/红 | 优先级低/中/高 |

### 7.2 字体

`SF Pro Display, SF Pro Text, -apple-system, PingFang SC, "Microsoft YaHei", sans-serif`

### 7.3 圆角

- `rounded-full`：按钮、搜索框、胶囊元素
- `rounded-2xl`：卡片
- `rounded-[18px]`：特殊容器
- 侧边栏导航项选中：圆角矩形背景

### 7.4 交互反馈

- 按钮：`active:scale-95` + 过渡
- 卡片：`hover:scale-1.02` + 阴影
- 页面切换：Framer Motion fade/slide
- 卡片增删：Framer Motion `AnimatePresence`

### 7.5 PlayerBar（底部毛玻璃播放条）

- 固定底部居中，`fixed bottom-6 left-1/2 -translate-x-1/2`
- `bg-white/70 backdrop-blur-2xl rounded-full shadow-lg`（Apple Music 风格毛玻璃）
- 左侧：当前任务标题（无则显示「未选择任务」）
- 中间：⏮ 重置 / ▶⏸ 播放暂停 / ⏹ 结束 控制按钮（圆形 `rounded-full`）
- 右侧：环形进度（SVG circle，stroke 为主题色）+ 剩余时间 mm:ss

## 8. 页面细节

### 8.1 看板（KanbanPage）

- 顶栏：页面标题「任务看板」+ 新建任务按钮 + SearchBar（按标题过滤）
- 主体：水平滚动 4 列，每列 `bg-white rounded-2xl`，列头含 emoji + 标题 + 任务数
- `@dnd-kit`：`DndContext` + `SortableContext`（每列一个），跨列拖拽
- 拖拽结束 → `moveTask`（乐观更新本地列 + PUT 同步）
- TaskCard：优先级色点 + 标题 + 描述预览 + 专注分钟徽标 + hover 操作（编辑/删除/一键专注）

### 8.2 专注（FocusPage）

- 模式选择：3 个胶囊按钮（专注 25min / 休息 5min / 自由 25min）
- 大表盘计时器（FocusTimer）：SVG 环形进度 + 剩余时间
- 控制：开始/暂停/继续/结束
- 当前任务选择：下拉列表关联任务
- 今日会话列表：模式徽标 + 任务标题 + 时长 + 时间

### 8.3 统计（StatsPage）

- 4 个 KPI 卡：总专注时长 / 总会话数 / 连续打卡 / 今日专注
- 30 天热力图：`grid grid-cols-10`（或自适应），每格 12px 圆角方块
- 分档：0 分钟 `#e8e8ed` / <25 `#ffd6db` / <50 `#ff9aa4` / ≥50 `#fa2d48`，hover 显示 `日期 + 分钟`

## 9. 错误处理与加载

- API 失败：`console.error` + 简单 toast（顶部红色胶囊提示）
- 数据加载：骨架屏 / 空态文案（「暂无任务，点击新建开始」）
- 计时器结束：自然结束自动提交 completed=1；手动结束提交 completed 按用户确认

## 10. 非目标（YAGNI）

- 无用户认证/多用户
- 无服务端热力图计算（前端根据 daily 数据渲染）
- 无任务搜索后端索引（前端过滤即可）
- 无通知/浏览器推送

## 11. 验收标准

1. `npm run dev` 一键启动前后端，打开 5173 可看到看板页
2. 看板可新建/编辑/删除任务，可在 4 列间拖拽并持久化
3. 专注计时 3 模式可运行，结束后任务 `pomodoroMinutes` 累加，统计页更新
4. 统计页显示 30 天热力图与 4 项 KPI
5. UI 符合 Apple Music 风格：深色侧边栏、毛玻璃 PlayerBar、大圆角、品红主题
