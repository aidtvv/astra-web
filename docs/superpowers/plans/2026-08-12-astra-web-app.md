# Astra Web App Implementation Plan (Frontend-Only)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Astra", a personal productivity web app with Kanban task management, Pomodoro focus timers, and daily statistics, styled after Apple Music Web's flat minimal UI with glassmorphism.

**Architecture:** **Frontend-only** — the `server/` directory is an **empty shell** (stub, not implemented). The React SPA (`client/`) runs standalone on Vite port 5173 and persists all data **client-side in localStorage** through a mock `services/api.ts` that exposes the same method signatures the store expects. No HTTP API is built or called.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS 3, Framer Motion, Zustand, @dnd-kit, react-router-dom. Persistence: localStorage (key `astra-db`). Tests: vitest + @testing-library/react.

## Global Constraints

- **React must be 18.x** (NOT 19). Pin `react@^18.3.1`, `react-dom@^18.3.1`.
- **Tailwind must be 3.x** (config-file based). The project uses `tailwind.config.js` + `postcss.config.js`; do NOT adopt Tailwind 4's CSS-first config.
- **Frontend dev server on port 5173. No backend port, no Vite proxy, no `/api` calls anywhere.**
- **`server/` is an empty shell**: `server/package.json` (scripts only) + `server/src/index.ts` (a stub that does nothing but document intent). No Express, no routes, no database, no tests for it. This is a deliberate user requirement.
- **UI copy is Chinese** (column names, buttons, empty states, labels).
- **All persistence is client-side** via a localStorage-backed `client/src/services/api.ts` under key `astra-db`. Its method signatures must match what the store calls (`getColumns`, `getTasks`, `createTask`, `updateTask`, `deleteTask`, `moveTask` is store-side, `startFocusSession`, `endFocusSession`, `getSessions`, `getDaily`, `getSummary`). Each method returns a Promise (may resolve immediately) so the store code is unchanged from an HTTP design.
- On first load (no `astra-db` in localStorage), seed 4 default columns: 📋待办 / 🚀进行中 / 🔍待审核 / ✅已完成. **No other seed data.**
- Deleting a task also removes its `pomodoro_sessions`; `daily_activities` statistics are always derived on-demand from completed sessions (never stored separately).
- UI design tokens: background `#f5f5f7`, surface `#ffffff`, primary `#fa2d48`, sidebar `#1d1d1f`. Font stack: `SF Pro Display, SF Pro Text, -apple-system, PingFang SC, Microsoft YaHei, sans-serif`. Large radii (`rounded-full`, `rounded-2xl`, `rounded-[18px]`). Buttons `active:scale-95`; cards `hover:scale-1.02`. PlayerBar is a frosted-glass (`backdrop-blur`) floating pill fixed at bottom-center.

---

### Task 1: Project shell + client scaffold (Vite + Tailwind + Router)

**Files:**
- Create: `package.json` (root)
- Create: `server/package.json` (empty shell)
- Create: `server/src/index.ts` (empty shell stub)
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/vitest.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/index.css`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/test/setup.ts`
- Create: `client/src/App.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: root scripts (`dev`/`test`), an empty-shell `server/`, and the App shell with React Router (`/`, `/focus`, `/stats` routes), global layout (Sidebar + main + PlayerBar), and design tokens in Tailwind + CSS. Later tasks fill in pages/components — create minimal stubs for `components/Sidebar.tsx`, `components/PlayerBar.tsx`, `pages/KanbanPage.tsx`, `pages/FocusPage.tsx`, `pages/StatsPage.tsx` now so routing compiles.

- [ ] **Step 1: Write the failing smoke test**

`client/src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// NOTE: At this task the pages/Sidebar/PlayerBar are stubs and App does not
// touch the store yet, so no mocking is needed. Sidebar labels are asserted
// once Sidebar is implemented.

describe('App shell', () => {
  it('renders a main content region', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npm install && npx vitest run src/App.test.tsx`
(If `client` deps are not yet installed, run `npm install` first.)
Expected: FAIL — App module missing.

- [ ] **Step 3: Create root package.json and server shell**

Root `package.json`:
```json
{
  "name": "astra",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "npm run dev --prefix client",
    "client": "npm run dev --prefix client",
    "test": "npm run test --prefix client"
  }
}
```

`server/package.json` (empty shell — no dependencies, no implementation):
```json
{
  "name": "astra-server",
  "private": true,
  "version": "0.1.0",
  "description": "Empty shell. API intentionally not implemented — Astra runs frontend-only and persists data in browser localStorage.",
  "scripts": {
    "dev": "echo 'Astra server is an empty shell. Run the client instead: npm run dev at the repo root.'"
  }
}
```

`server/src/index.ts` (stub — do not expand without the user's request):
```ts
// Astra server — intentionally an empty shell.
// The app runs frontend-only: the client persists data in localStorage
// under the key "astra-db" through client/src/services/api.ts.
export {};
```

- [ ] **Step 4: Create client package files**

`client/package.json`:
```json
{
  "name": "astra-client",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "framer-motion": "^11.15.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

`client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`client/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "tailwind.config.js", "postcss.config.js"]
}
```

`client/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
```

`client/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

`client/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create Tailwind + PostCSS + HTML**

`client/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#fa2d48', hover: '#e0243d', soft: '#ffeef0' },
        sidebar: '#1d1d1f',
        appbg: '#f5f5f7',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

`client/postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`client/index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Astra</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create global CSS with design tokens**

`client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-appbg font-sans text-neutral-900 antialiased;
  }
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-thumb {
    @apply rounded-full bg-neutral-300;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
}
```

- [ ] **Step 7: Create main entry, App shell, and page stubs**

`client/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

`client/src/App.tsx`:
```tsx
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import KanbanPage from './pages/KanbanPage';
import FocusPage from './pages/FocusPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-60 min-h-screen px-8 pb-32 pt-6">
        <Routes>
          <Route path="/" element={<KanbanPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  );
}
```

Create minimal stubs so the shell compiles (each replaced in later tasks):
- `client/src/components/Sidebar.tsx` → `export default function Sidebar() { return <aside>Sidebar</aside>; }`
- `client/src/components/PlayerBar.tsx` → `export default function PlayerBar() { return <div />; }`
- `client/src/pages/KanbanPage.tsx` → `export default function KanbanPage() { return <div />; }`
- `client/src/pages/FocusPage.tsx` → `export default function FocusPage() { return <div />; }`
- `client/src/pages/StatsPage.tsx` → `export default function StatsPage() { return <div />; }`

- [ ] **Step 8: Install deps and verify test + typecheck pass**

Run: `cd client && npm install && npx vitest run src/App.test.tsx`
Expected: PASS (smoke test).

Run: `cd client && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 9: Commit**

```bash
git add package.json server client
git commit -m "feat(client): scaffold vite react ts tailwind with router shell and empty server shell"
```

---

### Task 2: Client data layer (types + localStorage api + Zustand store)

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/services/api.ts`
- Create: `client/src/services/__tests__/api.test.ts`
- Create: `client/src/store/index.ts`
- Create: `client/src/store/__tests__/store.test.ts`

**Interfaces:**
- Consumes: the store's expected API method signatures (below).
- Produces:
  - `types/index.ts` exporting `Column`, `Task`, `PomodoroSession`, `DailyStat`, `Summary`.
  - `services/api.ts` exporting `api` — a **localStorage-backed mock** (no network). Methods: `getColumns`, `createColumn`, `updateColumn`, `deleteColumn`, `getTasks(columnId?)`, `createTask`, `updateTask`, `deleteTask`, `startFocusSession(mode, taskId?)`, `endFocusSession(id, duration, completed)`, `getSessions`, `getDaily(days)`, `getSummary`. Every method returns a Promise. Storage key `astra-db`.
  - `store/index.ts` exporting `useStore` (zustand) and `initialStore` (test reset). Same store shape as the design spec (columns/tasks/sessions/daily/summary + timer state machine + CRUD + moveTaskToIndex).

- [ ] **Step 1: Write the failing api test**

`client/src/services/__tests__/api.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../api';

beforeEach(() => {
  localStorage.clear();
});

describe('localStorage api', () => {
  it('seeds 4 default columns on first access', async () => {
    const columns = await api.getColumns();
    expect(columns.map((c) => c.title)).toEqual(['待办', '进行中', '待审核', '已完成']);
  });

  it('creates a task and persists it', async () => {
    const columns = await api.getColumns();
    const task = await api.createTask({ title: '写周报', columnId: columns[0].id, priority: 'high' });
    expect(task.id).toBeTruthy();
    expect(task.priority).toBe('high');
    const tasks = await api.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('写周报');
  });

  it('endFocusSession accumulates minutes onto the task', async () => {
    const columns = await api.getColumns();
    const task = await api.createTask({ title: '读书', columnId: columns[0].id });
    const started = await api.startFocusSession('focus', task.id);
    await api.endFocusSession(started.id, 25, true);
    const tasks = await api.getTasks();
    expect(tasks[0].pomodoroMinutes).toBe(25);
  });

  it('getDaily and getSummary reflect completed sessions', async () => {
    const started = await api.startFocusSession('free', null);
    await api.endFocusSession(started.id, 30, true);
    const daily = await api.getDaily(1);
    expect(daily).toHaveLength(1);
    expect(daily[0].minutes).toBe(30);
    const summary = await api.getSummary();
    expect(summary.totalMinutes).toBe(30);
    expect(summary.totalSessions).toBe(1);
    expect(summary.todayMinutes).toBe(30);
    expect(summary.streakDays).toBeGreaterThanOrEqual(1);
  });

  it('deleteTask removes the task and its sessions', async () => {
    const columns = await api.getColumns();
    const task = await api.createTask({ title: 'A', columnId: columns[0].id });
    const started = await api.startFocusSession('focus', task.id);
    await api.endFocusSession(started.id, 10, true);
    await api.deleteTask(task.id);
    const sessions = await api.getSessions();
    expect(sessions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/services/__tests__/api.test.ts`
Expected: FAIL — api module missing.

- [ ] **Step 3: Create client types**

`client/src/types/index.ts`:
```ts
export interface Column {
  id: number;
  title: string;
  order: number;
  emoji: string;
  accentColor: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  columnId: number;
  priority: 'high' | 'medium' | 'low';
  pomodoroMinutes: number;
  order: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PomodoroSession {
  id: number;
  taskId: number | null;
  taskTitle: string;
  duration: number;
  completed: boolean;
  startedAt: string;
  finishedAt: string | null;
  mode: 'focus' | 'break' | 'free';
}

export interface DailyStat {
  date: string;
  minutes: number;
}

export interface Summary {
  totalMinutes: number;
  totalSessions: number;
  streakDays: number;
  todayMinutes: number;
}
```

- [ ] **Step 4: Create the localStorage-backed api service**

`client/src/services/api.ts`:
```ts
import type { Column, Task, PomodoroSession, DailyStat, Summary } from '../types';

// Frontend-only persistence layer. The server is an empty shell, so this
// module backs the store with localStorage under a single key. Every method
// returns a Promise so the store code is identical to an HTTP design.

const DB_KEY = 'astra-db';

export interface LocalDB {
  columns: Column[];
  tasks: Task[];
  sessions: PomodoroSession[];
  seq: number;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 1, title: '待办', order: 0, emoji: '📋', accentColor: '#fa2d48' },
  { id: 2, title: '进行中', order: 1, emoji: '🚀', accentColor: '#ff9500' },
  { id: 3, title: '待审核', order: 2, emoji: '🔍', accentColor: '#5856d6' },
  { id: 4, title: '已完成', order: 3, emoji: '✅', accentColor: '#34c759' },
];

function emptyDB(): LocalDB {
  return { columns: DEFAULT_COLUMNS, tasks: [], sessions: [], seq: 100 };
}

function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as Partial<LocalDB>;
    return {
      columns: parsed.columns && parsed.columns.length > 0 ? parsed.columns : DEFAULT_COLUMNS,
      tasks: parsed.tasks ?? [],
      sessions: parsed.sessions ?? [],
      seq: typeof parsed.seq === 'number' ? parsed.seq : 100,
    };
  } catch {
    return emptyDB();
  }
}

function saveDB(db: LocalDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function nextId(db: LocalDB): number {
  db.seq += 1;
  return db.seq;
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function resolve<T>(value: T): Promise<T> {
  return value;
}

export const api = {
  getColumns: async (): Promise<Column[]> => {
    const db = loadDB();
    return resolve([...db.columns].sort((a, b) => a.order - b.order));
  },

  createColumn: async (data: { title: string; emoji?: string; accentColor?: string }): Promise<Column> => {
    const db = loadDB();
    const column: Column = {
      id: nextId(db),
      title: data.title,
      order: db.columns.length,
      emoji: data.emoji ?? '📌',
      accentColor: data.accentColor ?? '#fa2d48',
    };
    db.columns.push(column);
    saveDB(db);
    return resolve(column);
  },

  updateColumn: async (id: number, data: Partial<Column>): Promise<Column> => {
    const db = loadDB();
    const column = db.columns.find((c) => c.id === id);
    if (!column) throw new Error('Column not found');
    Object.assign(column, data);
    saveDB(db);
    return resolve(column);
  },

  deleteColumn: async (id: number): Promise<{ ok: boolean }> => {
    const db = loadDB();
    db.columns = db.columns.filter((c) => c.id !== id);
    db.tasks = db.tasks.filter((t) => t.columnId !== id);
    saveDB(db);
    return resolve({ ok: true });
  },

  getTasks: async (columnId?: number): Promise<Task[]> => {
    const db = loadDB();
    const rows = columnId != null ? db.tasks.filter((t) => t.columnId === columnId) : db.tasks;
    return resolve([...rows].sort((a, b) => a.order - b.order));
  },

  createTask: async (data: Partial<Task>): Promise<Task> => {
    const db = loadDB();
    const columnId = data.columnId ?? db.columns[0]?.id;
    if (columnId == null) throw new Error('columnId is required');
    const maxOrder = db.tasks.filter((t) => t.columnId === columnId).reduce((m, t) => Math.max(m, t.order), -1);
    const task: Task = {
      id: nextId(db),
      title: data.title ?? '',
      description: data.description ?? '',
      columnId,
      priority: data.priority ?? 'medium',
      pomodoroMinutes: 0,
      order: maxOrder + 1,
      dueDate: data.dueDate ?? null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(task);
    saveDB(db);
    return resolve(task);
  },

  updateTask: async (id: number, data: Partial<Task>): Promise<Task> => {
    const db = loadDB();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    Object.assign(task, data);
    saveDB(db);
    return resolve({ ...task });
  },

  deleteTask: async (id: number): Promise<{ ok: boolean }> => {
    const db = loadDB();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    db.sessions = db.sessions.filter((s) => s.taskId !== id);
    saveDB(db);
    return resolve({ ok: true });
  },

  startFocusSession: async (mode: string, taskId?: number | null): Promise<{ id: number; startedAt: string }> => {
    const db = loadDB();
    const task = taskId != null ? db.tasks.find((t) => t.id === taskId) : undefined;
    const session: PomodoroSession = {
      id: nextId(db),
      taskId: taskId ?? null,
      taskTitle: task?.title ?? '',
      duration: 0,
      completed: false,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      mode: (['focus', 'break', 'free'].includes(mode) ? mode : 'focus') as PomodoroSession['mode'],
    };
    db.sessions.unshift(session);
    saveDB(db);
    return resolve({ id: session.id, startedAt: session.startedAt });
  },

  endFocusSession: async (id: number, duration: number, completed: boolean): Promise<{ ok: boolean }> => {
    const db = loadDB();
    const session = db.sessions.find((s) => s.id === id);
    if (!session) throw new Error('Session not found');
    session.duration = duration;
    session.completed = completed;
    session.finishedAt = new Date().toISOString();
    if (completed && duration > 0 && session.taskId != null) {
      const task = db.tasks.find((t) => t.id === session.taskId);
      if (task) task.pomodoroMinutes += duration;
    }
    saveDB(db);
    return resolve({ ok: true });
  },

  getSessions: async (): Promise<PomodoroSession[]> => {
    const db = loadDB();
    return resolve([...db.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  },

  getDaily: async (days = 30): Promise<DailyStat[]> => {
    const db = loadDB();
    const byDate = new Map<string, number>();
    for (const s of db.sessions) {
      if (!s.completed) continue;
      const key = localDate(new Date(s.startedAt));
      byDate.set(key, (byDate.get(key) ?? 0) + s.duration);
    }
    const result: DailyStat[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = localDate(d);
      result.push({ date: key, minutes: byDate.get(key) ?? 0 });
    }
    return resolve(result);
  },

  getSummary: async (): Promise<Summary> => {
    const db = loadDB();
    const completed = db.sessions.filter((s) => s.completed);
    const totalMinutes = completed.reduce((sum, s) => sum + s.duration, 0);
    const positiveDays = new Set<string>();
    for (const s of completed) {
      if (s.duration > 0) positiveDays.add(localDate(new Date(s.startedAt)));
    }
    const today = localDate(new Date());
    const todayMinutes = completed.filter((s) => localDate(new Date(s.startedAt)) === today).reduce((sum, s) => sum + s.duration, 0);
    let streak = 0;
    const cursor = new Date();
    if (!positiveDays.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (positiveDays.has(localDate(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return resolve({ totalMinutes, totalSessions: completed.length, streakDays: streak, todayMinutes });
  },
};
```

- [ ] **Step 5: Write the failing store test**

`client/src/store/__tests__/store.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, initialStore } from '../index';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '2026-08-12T00:00:00.000Z' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
  },
}));

const mockApi = api as unknown as {
  startFocusSession: ReturnType<typeof vi.fn>;
  endFocusSession: ReturnType<typeof vi.fn>;
  updateTask: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('timer state machine', () => {
  it('starts a focus timer with 25 minutes remaining', async () => {
    await useStore.getState().startTimer('focus');
    const s = useStore.getState();
    expect(s.status).toBe('running');
    expect(s.remainingSeconds).toBe(25 * 60);
    expect(mockApi.startFocusSession).toHaveBeenCalledWith('focus', null);
  });

  it('tick decrements remaining seconds', async () => {
    await useStore.getState().startTimer('focus');
    useStore.getState().tick();
    expect(useStore.getState().remainingSeconds).toBe(25 * 60 - 1);
  });

  it('pause then resume keeps remaining seconds', async () => {
    await useStore.getState().startTimer('focus');
    useStore.getState().tick();
    useStore.getState().pauseTimer();
    expect(useStore.getState().status).toBe('paused');
    useStore.getState().resumeTimer();
    expect(useStore.getState().status).toBe('running');
    expect(useStore.getState().remainingSeconds).toBe(25 * 60 - 1);
  });

  it('auto-completes when remaining hits zero and records 25 minutes', async () => {
    await useStore.getState().startTimer('focus');
    // fast-forward to 1 second remaining
    useStore.setState({ remainingSeconds: 1 });
    useStore.getState().tick();
    // endTimer is async (two awaits inside) — wait for it to flush
    await vi.waitFor(() => expect(useStore.getState().status).toBe('idle'));
    expect(mockApi.endFocusSession).toHaveBeenCalledWith(1, 25, true);
  });

  it('endTimer(false) aborts without recording minutes', async () => {
    await useStore.getState().startTimer('focus');
    await useStore.getState().endTimer(false);
    expect(useStore.getState().status).toBe('idle');
    expect(mockApi.endFocusSession).toHaveBeenCalledWith(1, 0, false);
  });
});

describe('moveTaskToIndex', () => {
  it('reorders within a column and persists the moved task', async () => {
    useStore.setState({
      ...initialStore,
      tasks: [
        { id: 1, title: 'A', columnId: 1, order: 0, description: '', priority: 'medium', pomodoroMinutes: 0, dueDate: null, completedAt: null, createdAt: '' },
        { id: 2, title: 'B', columnId: 1, order: 1, description: '', priority: 'medium', pomodoroMinutes: 0, dueDate: null, completedAt: null, createdAt: '' },
      ],
    });
    await useStore.getState().moveTaskToIndex(2, 1, 0);
    const tasks = useStore.getState().tasks;
    expect(tasks.find(t => t.id === 2)!.order).toBe(0);
    expect(tasks.find(t => t.id === 1)!.order).toBe(1);
    expect(mockApi.updateTask).toHaveBeenCalledWith(2, { columnId: 1, order: 0 });
  });

  it('moves a task across columns and updates columnId', async () => {
    useStore.setState({
      ...initialStore,
      tasks: [
        { id: 1, title: 'A', columnId: 1, order: 0, description: '', priority: 'medium', pomodoroMinutes: 0, dueDate: null, completedAt: null, createdAt: '' },
        { id: 2, title: 'B', columnId: 2, order: 0, description: '', priority: 'medium', pomodoroMinutes: 0, dueDate: null, completedAt: null, createdAt: '' },
      ],
    });
    await useStore.getState().moveTaskToIndex(1, 2, 0);
    const moved = useStore.getState().tasks.find(t => t.id === 1)!;
    expect(moved.columnId).toBe(2);
    expect(moved.order).toBe(0);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd client && npx vitest run src/store/__tests__/store.test.ts`
Expected: FAIL — store module missing.

- [ ] **Step 7: Create the Zustand store**

`client/src/store/index.ts`:
```ts
import { create } from 'zustand';
import { api } from '../services/api';
import type { Column, Task, PomodoroSession, DailyStat, Summary } from '../types';

export type FocusMode = 'focus' | 'break' | 'free';
export type TimerStatus = 'idle' | 'running' | 'paused';

export const MODE_MINUTES: Record<FocusMode, number> = { focus: 25, break: 5, free: 25 };

export const initialStore = {
  columns: [] as Column[],
  tasks: [] as Task[],
  sessions: [] as PomodoroSession[],
  daily: [] as DailyStat[],
  summary: { totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 } as Summary,
  loading: true,
  status: 'idle' as TimerStatus,
  mode: 'focus' as FocusMode,
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  taskId: null as number | null,
  sessionId: null as number | null,
  /** One-shot hint: when set, the TaskModal create-form defaults to this column. */
  modalDefaultColumn: null as number | null,
};

interface Store extends typeof initialStore {
  loadAll(): Promise<void>;
  loadStats(): Promise<void>;
  refreshAfterFocus(): Promise<void>;

  createTask(data: Partial<Task>): Promise<void>;
  updateTask(id: number, data: Partial<Task>): Promise<void>;
  deleteTask(id: number): Promise<void>;
  moveTaskToIndex(taskId: number, columnId: number, index: number): Promise<void>;
  addColumn(title: string): Promise<void>;

  setMode(mode: FocusMode): void;
  startTimer(mode: FocusMode, taskId?: number | null): Promise<void>;
  pauseTimer(): void;
  resumeTimer(): void;
  tick(): void;
  endTimer(completed: boolean): Promise<void>;
}

function resetTimerFields(initial: typeof initialStore) {
  return { status: 'idle', sessionId: null, taskId: null, remainingSeconds: initial.totalSeconds };
}

export const useStore = create<Store>((set, get) => ({
  ...initialStore,

  loadAll: async () => {
    set({ loading: true });
    try {
      const [columns, tasks, sessions] = await Promise.all([
        api.getColumns(),
        api.getTasks(),
        api.getSessions(),
      ]);
      set({ columns, tasks, sessions, loading: false });
    } catch (e) {
      console.error('loadAll failed', e);
      set({ loading: false });
    }
  },

  loadStats: async () => {
    try {
      const [daily, summary] = await Promise.all([api.getDaily(30), api.getSummary()]);
      set({ daily, summary });
    } catch (e) {
      console.error('loadStats failed', e);
    }
  },

  refreshAfterFocus: async () => {
    try {
      const [tasks, sessions, daily, summary] = await Promise.all([
        api.getTasks(),
        api.getSessions(),
        api.getDaily(30),
        api.getSummary(),
      ]);
      set({ tasks, sessions, daily, summary });
    } catch (e) {
      console.error('refreshAfterFocus failed', e);
    }
  },

  createTask: async (data) => {
    const task = await api.createTask(data);
    set((s) => ({ tasks: [...s.tasks, task] }));
  },
  updateTask: async (id, data) => {
    const updated = await api.updateTask(id, data);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
  },
  deleteTask: async (id) => {
    await api.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  moveTaskToIndex: async (taskId, columnId, index) => {
    const { tasks } = get();
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving) return;
    const others = tasks.filter((t) => t.id !== taskId);
    const target = others
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ ...t }));
    const clamped = Math.max(0, Math.min(index, target.length));
    target.splice(clamped, 0, { ...moving, columnId });
    target.forEach((t, i) => {
      t.order = i;
      t.columnId = columnId;
    });
    set({ tasks: [...others.filter((t) => t.columnId !== columnId), ...target] });
    await Promise.all(target.map((t) => api.updateTask(t.id, { columnId, order: t.order })));
  },
  addColumn: async (title) => {
    const column = await api.createColumn({ title });
    set((s) => ({ columns: [...s.columns, column] }));
  },

  setMode: (mode) => {
    if (get().status !== 'idle') return;
    set({ mode, totalSeconds: MODE_MINUTES[mode] * 60, remainingSeconds: MODE_MINUTES[mode] * 60 });
  },

  startTimer: async (mode, taskId = null) => {
    const res = await api.startFocusSession(mode, taskId);
    set({
      status: 'running',
      mode,
      taskId,
      sessionId: res.id,
      totalSeconds: MODE_MINUTES[mode] * 60,
      remainingSeconds: MODE_MINUTES[mode] * 60,
    });
  },

  pauseTimer: () => set((s) => (s.status === 'running' ? { status: 'paused' } : {})),
  resumeTimer: () => set((s) => (s.status === 'paused' ? { status: 'running' } : {})),

  tick: () => {
    const { status, remainingSeconds } = get();
    if (status !== 'running') return;
    const next = remainingSeconds - 1;
    if (next <= 0) {
      set({ remainingSeconds: 0, status: 'paused' });
      get().endTimer(true);
    } else {
      set({ remainingSeconds: next });
    }
  },

  endTimer: async (completed) => {
    const { sessionId, totalSeconds, remainingSeconds } = get();
    if (sessionId == null) return;
    const elapsed = totalSeconds - remainingSeconds;
    const duration = completed ? Math.max(1, Math.round(elapsed / 60)) : 0;
    await api.endFocusSession(sessionId, duration, completed);
    set(resetTimerFields(initialStore));
    await get().refreshAfterFocus();
  },
}));
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd client && npx vitest run`
Expected: PASS — api tests + store tests + App smoke test all green.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add client/src/types client/src/services client/src/store
git commit -m "feat(client): types, localStorage-backed api, and zustand store with timer + moveTask logic"
```

---

### Task 3: Sidebar + SearchBar

**Files:**
- Modify: `client/src/components/Sidebar.tsx`
- Create: `client/src/components/SearchBar.tsx`

**Interfaces:**
- Consumes: `NavLink` from react-router-dom.
- Produces: `Sidebar` (fixed dark column with brand, nav links 看板/专注/统计, bottom welcome + date) and `SearchBar` (controlled input with `value`/`onChange` props, pill shape).

- [ ] **Step 1: Implement Sidebar**

`client/src/components/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '看板', icon: '🗂️' },
  { to: '/focus', label: '专注', icon: '⏱️' },
  { to: '/stats', label: '统计', icon: '📊' },
];

export default function Sidebar() {
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col bg-sidebar p-4 text-white">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">A</div>
        <span className="text-xl font-bold tracking-tight">Astra</span>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                isActive ? 'bg-white/10 font-semibold text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">
        <p className="font-semibold text-white/90">你好，欢迎回来 👋</p>
        <p className="mt-1 text-xs text-white/50">{today}</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Implement SearchBar**

`client/src/components/SearchBar.tsx`:
```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = '搜索任务…' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-transparent bg-white px-4 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Sidebar.tsx client/src/components/SearchBar.tsx
git commit -m "feat(client): sidebar navigation and search bar"
```

---

### Task 4: TaskCard + TaskModal

**Files:**
- Create: `client/src/components/TaskCard.tsx`
- Create: `client/src/components/TaskModal.tsx`
- Create: `client/src/components/__tests__/TaskCard.test.tsx`

**Interfaces:**
- Consumes: `Task`, `Column` types; `useStore` (`deleteTask`, `updateTask`, `createTask`, `startTimer`); `useNavigate` for "一键专注" (navigates to `/focus` after starting).
- Produces:
  - `TaskCard({ task, onEdit }: { task: Task; onEdit: (task: Task) => void })` — draggable card; rendered inside a `SortableTaskCard` wrapper in Task 5 that adds `useSortable` props. Buttons: 编辑 (opens modal), ⏱ 专注 (starts timer for task and navigates to /focus), 删除 (confirm then `deleteTask`).
  - `TaskModal({ open, onClose, task?, columns }: { open: boolean; onClose: () => void; task?: Task | null; columns: Column[] })` — form: 标题, 描述, 优先级 (3 pills), 截止日期 (date input), 所属列 (select). Save creates or updates via store.

- [ ] **Step 1: Write the failing component test**

`client/src/components/__tests__/TaskCard.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskCard from '../TaskCard';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    deleteTask: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
  },
}));

const task = {
  id: 1, title: '写周报', description: '本周进展总结',
  columnId: 1, priority: 'high' as const, pomodoroMinutes: 25,
  order: 0, dueDate: null, completedAt: null, createdAt: '',
};

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('TaskCard', () => {
  it('renders title, priority dot, and minutes badge', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('写周报')).toBeTruthy();
    expect(screen.getByText('25 分钟')).toBeTruthy();
  });

  it('shows action buttons on hover', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    fireEvent.mouseEnter(screen.getByText('写周报'));
    expect(screen.getByLabelText('编辑')).toBeTruthy();
    expect(screen.getByLabelText('专注')).toBeTruthy();
    expect(screen.getByLabelText('删除')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/components/__tests__/TaskCard.test.tsx`
Expected: FAIL — TaskCard missing.

- [ ] **Step 3: Implement TaskCard**

`client/src/components/TaskCard.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import type { Task } from '../types';
import { useStore } from '../store';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: 'bg-primary',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const PRIORITY_LABEL: Record<Task['priority'], string> = { high: '高', medium: '中', low: '低' };

interface TaskCardProps extends React.HTMLAttributes<HTMLElement> {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit, ...rest }: TaskCardProps) {
  const startTimer = useStore((s) => s.startTimer);
  const deleteTask = useStore((s) => s.deleteTask);
  const navigate = useNavigate();

  async function handleFocus() {
    await startTimer('focus', task.id);
    navigate('/focus');
  }

  async function handleDelete() {
    if (window.confirm(`确定删除任务「${task.title}」吗？`)) {
      await deleteTask(task.id);
    }
  }

  return (
    <article {...rest} className="group cursor-grab rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:scale-1.02 hover:shadow-md active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLOR[task.priority]}`} title={`优先级：${PRIORITY_LABEL[task.priority]}`} />
          <h3 className="truncate text-sm font-semibold text-neutral-900">{task.title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">{task.description}</p>}

      <div className="mt-3 flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-full bg-appbg px-2 py-1 text-xs text-neutral-600">
          ⏱ {task.pomodoroMinutes} 分钟
        </span>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-neutral-400">📅 {task.dueDate}</span>
        )}
      </div>

      <div className="mt-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={() => onEdit(task)} aria-label="编辑"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-primary/10 hover:text-primary active:scale-95">
          ✏️
        </button>
        <button onClick={handleFocus} aria-label="专注"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-primary/10 hover:text-primary active:scale-95">
          ▶
        </button>
        <button onClick={handleDelete} aria-label="删除"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-red-100 hover:text-red-600 active:scale-95">
          ✕
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Implement TaskModal**

`client/src/components/TaskModal.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { Task, Column } from '../types';
import { useStore } from '../store';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  columns: Column[];
}

const PRIORITIES: { value: Task['priority']; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export default function TaskModal({ open, onClose, task, columns }: TaskModalProps) {
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [columnId, setColumnId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (open) {
      // modalDefaultColumn is a one-shot hint set by KanbanPage's per-column "＋" button
      const defaultColumnId = useStore.getState().modalDefaultColumn ?? columns[0]?.id ?? '';
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setPriority(task?.priority ?? 'medium');
      setColumnId(task?.columnId ?? defaultColumnId);
      setDueDate(task?.dueDate ?? '');
      useStore.setState({ modalDefaultColumn: null });
    }
  }, [open, task, columns]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (task) {
      await updateTask(task.id, {
        title: title.trim(),
        description,
        priority,
        columnId: columnId as number,
        dueDate: dueDate || null,
      });
    } else {
      await createTask({ title: title.trim(), description, priority, columnId: columnId as number, dueDate: dueDate || null });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[18px] bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-neutral-900">{task ? '编辑任务' : '新建任务'}</h2>

        <label className="mt-5 block text-sm font-medium text-neutral-600">标题</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="要做点什么？"
          className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="补充细节…"
          className="mt-1.5 w-full resize-none rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">优先级</label>
        <div className="mt-1.5 flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                priority === p.value ? 'bg-primary text-white' : 'bg-appbg text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-600">所属列</label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600">截止日期</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-medium text-neutral-500 transition hover:bg-appbg active:scale-95">
            取消
          </button>
          <button type="submit" disabled={!title.trim()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-50">
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client && npx vitest run src/components/__tests__/TaskCard.test.tsx`
Expected: PASS.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TaskCard.tsx client/src/components/TaskModal.tsx client/src/components/__tests__
git commit -m "feat(client): task card and task modal components"
```

---

### Task 5: KanbanPage (5-column grid + drag-and-drop)

**Files:**
- Modify: `client/src/pages/KanbanPage.tsx` (replace stub)
- Create: `client/src/components/SortableTaskCard.tsx`

**Interfaces:**
- Consumes: `useStore` (`columns`, `tasks`, `moveTaskToIndex`), `TaskCard`, `TaskModal`, `SearchBar`, `@dnd-kit` (`DndContext`, `PointerSensor`, `closestCorners`), `@dnd-kit/sortable` (`SortableContext`, `verticalListSortingStrategy`, `useSortable`, `CSS`), Framer Motion (`AnimatePresence`, `motion`).
- Produces: `KanbanPage` — top bar (title + 新建任务 + SearchBar), horizontal 5-column grid (`grid-cols-5` on `xl`, fallback horizontal scroll), per-column `SortableContext`, drag overlay, TaskModal wiring.
- Produces: `SortableTaskCard({ task, onEdit })` — `useSortable` wrapper around `TaskCard` (passes `setNodeRef`, `style`, `attributes`, `listeners`). TaskCard already spreads `...rest` onto its `<article>`, so it accepts these props directly (from Task 4).

- [ ] **Step 1: Create SortableTaskCard**

`client/src/components/SortableTaskCard.tsx`:
```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import TaskCard from './TaskCard';

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function SortableTaskCard({ task, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      onEdit={onEdit}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
}
```

Note: `TaskCard` needs to accept a `ref`. Change `TaskCard` in Task 4 to `forwardRef` so `setNodeRef` works:
```tsx
import { forwardRef } from 'react';
const TaskCard = forwardRef<HTMLElement, TaskCardProps>(function TaskCard({ task, onEdit, ...rest }, ref) {
  // ... same body ...
  return <article ref={ref} {...rest} className="group ...">
});
```

- [ ] **Step 2: Implement KanbanPage**

`client/src/pages/KanbanPage.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import type { Task, Column } from '../types';
import SortableTaskCard from '../components/SortableTaskCard';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import SearchBar from '../components/SearchBar';

export default function KanbanPage() {
  const columns = useStore((s) => s.columns);
  const tasks = useStore((s) => s.tasks);
  const loading = useStore((s) => s.loading);
  const loadAll = useStore((s) => s.loadAll);
  const moveTaskToIndex = useStore((s) => s.moveTaskToIndex);

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredTasks = useMemo(
    () => (query.trim() ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())) : tasks),
    [tasks, query]
  );

  function tasksInColumn(columnId: number): Task[] {
    return filteredTasks.filter((t) => t.columnId === columnId).sort((a, b) => a.order - b.order);
  }

  function handleDragStart(e: { active: { id: React.ReactText } }) {
    setActiveId(Number(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdNum = Number(active.id);
    const overId = Number(over.id);

    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      // Dropped directly on an empty column area → append at the end.
      const count = filteredTasks.filter((t) => t.columnId === targetColumn.id).length;
      await moveTaskToIndex(activeIdNum, targetColumn.id, count);
      return;
    }

    // Dropped on another task (same or different column).
    const overTask = filteredTasks.find((t) => t.id === overId);
    if (!overTask) return;
    const destColumnId = overTask.columnId;
    const withoutActive = filteredTasks.filter((t) => t.id !== activeIdNum);
    const targetColTasks = withoutActive
      .filter((t) => t.columnId === destColumnId)
      .sort((a, b) => a.order - b.order);
    const overIndex = targetColTasks.findIndex((t) => t.id === overId);
    const index = overIndex === -1 ? targetColTasks.length : overIndex;
    await moveTaskToIndex(activeIdNum, destColumnId, index);
  }

  const activeTask = activeId != null ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">任务看板</h1>
          <p className="mt-1 text-sm text-neutral-500">拖拽卡片管理你的任务流程</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchBar value={query} onChange={setQuery} /></div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-95"
          >
            ＋ 新建任务
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 text-center text-sm text-neutral-400">加载中…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {columns.map((column: Column) => {
              const colTasks = tasksInColumn(column.id);
              return (
                <section key={column.id} className="flex min-h-[240px] flex-col rounded-2xl bg-white/60 p-3 backdrop-blur-sm">
                  <header className="flex items-center justify-between px-1 pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                      <span>{column.emoji}</span>
                      {column.title}
                      <span className="rounded-full bg-appbg px-2 py-0.5 text-xs text-neutral-500">{colTasks.length}</span>
                    </h2>
                    <button
                      onClick={() => { setEditing(null); setModalOpen(true); useStore.setState({ modalDefaultColumn: column.id }); }}
                      aria-label={`添加到${column.title}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition hover:bg-appbg hover:text-neutral-700 active:scale-95"
                    >
                      ＋
                    </button>
                  </header>

                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-1 flex-col gap-3">
                      <AnimatePresence>
                        {colTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                          >
                            <SortableTaskCard task={task} onEdit={(t) => { setEditing(t); setModalOpen(true); }} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {colTasks.length === 0 && (
                        <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-10 text-xs text-neutral-400">
                          拖拽任务到这里
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </section>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? <div className="rotate-3"><TaskCard task={activeTask} onEdit={() => {}} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        columns={columns}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: no errors, all existing client tests green.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/KanbanPage.tsx client/src/components/SortableTaskCard.tsx client/src/components/TaskCard.tsx
git commit -m "feat(client): kanban board with 5-column grid and cross-column drag-drop"
```

---

### Task 6: FocusTimer + PlayerBar

**Files:**
- Modify: `client/src/components/PlayerBar.tsx` (replace stub)
- Create: `client/src/components/FocusTimer.tsx`
- Create: `client/src/components/__tests__/FocusTimer.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`status`, `mode`, `totalSeconds`, `remainingSeconds`, `taskId`, `tasks`, `setMode`, `startTimer`, `pauseTimer`, `resumeTimer`, `endTimer`), react-router `useNavigate`.
- Produces:
  - `FocusTimer` — big SVG progress ring + mm:ss + mode pills (专注/休息/自由) + task `<select>` + start/pause/resume/reset buttons. Uses `MODE_MINUTES` for labels.
  - `PlayerBar` — floating frosted-glass pill fixed `bottom-6` centered. Left: current task title. Center: play/pause + stop buttons (round). Right: small SVG ring + mm:ss. When idle, shows「未在计时」and play button is disabled.
  - The global 1-second tick interval: `useEffect` in **App.tsx** — `if (status === 'running') { const i = setInterval(() => tick(), 1000); return () => clearInterval(i); }`. Add this to App.tsx in this task.

- [ ] **Step 1: Write the failing FocusTimer test**

`client/src/components/__tests__/FocusTimer.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FocusTimer from '../FocusTimer';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
    updateTask: vi.fn(async () => ({})),
  },
}));

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('FocusTimer', () => {
  it('shows 25:00 for focus mode', () => {
    render(<MemoryRouter><FocusTimer /></MemoryRouter>);
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('mode pill switches duration to 5:00 for break', async () => {
    render(<MemoryRouter><FocusTimer /></MemoryRouter>);
    fireEvent.click(screen.getByText('休息'));
    expect(screen.getByText('05:00')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/components/__tests__/FocusTimer.test.tsx`
Expected: FAIL — FocusTimer missing.

- [ ] **Step 3: Implement FocusTimer**

`client/src/components/FocusTimer.tsx`:
```tsx
import { useState } from 'react';
import { useStore, MODE_MINUTES, type FocusMode } from '../store';

const MODES: { key: FocusMode; label: string }[] = [
  { key: 'focus', label: '专注' },
  { key: 'break', label: '休息' },
  { key: 'free', label: '自由' },
];

function fmt(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function FocusTimer() {
  const { status, mode, totalSeconds, remainingSeconds, taskId, tasks, setMode, startTimer, pauseTimer, resumeTimer, endTimer } = useStore();
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const R = 128;
  const CIRC = 2 * Math.PI * R;

  function handleStart() {
    const tid = selectedTaskId === '' ? null : Number(selectedTaskId);
    startTimer(mode, tid);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-sm">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            disabled={status !== 'idle'}
            className={`rounded-full px-5 py-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === m.key ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-appbg'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative mt-8 flex h-72 w-72 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 288 288">
          <circle cx="144" cy="144" r={R} fill="none" stroke="#e8e8ed" strokeWidth="12" />
          <circle
            cx="144" cy="144" r={R} fill="none" stroke="#fa2d48" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-6xl font-bold tabular-nums text-neutral-900">{fmt(remainingSeconds)}</div>
          <div className="mt-2 text-sm font-medium text-neutral-500">{MODE_MINUTES[mode]} 分钟 · {MODES.find((m) => m.key === mode)!.label}</div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {status === 'idle' ? (
          <button onClick={handleStart}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover active:scale-95">
            ▶
          </button>
        ) : status === 'paused' ? (
          <button onClick={resumeTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover active:scale-95">
            ▶
          </button>
        ) : (
          <button onClick={pauseTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition active:scale-95">
            ❚❚
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={() => endTimer(false)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
            aria-label="结束">
            ⏹
          </button>
        )}
      </div>

      <div className="mt-6 w-64">
        <label className="block text-sm font-medium text-neutral-600">关联任务</label>
        <select
          value={taskId ?? selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={status !== 'idle'}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="">不关联任务（自由模式）</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement PlayerBar and the global tick in App**

`client/src/components/PlayerBar.tsx`:
```tsx
import { useStore } from '../store';

const MODE_LABEL = { focus: '专注', break: '休息', free: '自由' } as const;

function fmt(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { status, mode, totalSeconds, remainingSeconds, taskId, tasks, pauseTimer, resumeTimer, endTimer } = useStore();
  const task = tasks.find((t) => t.id === taskId);
  const active = status !== 'idle';
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const R = 16;
  const CIRC = 2 * Math.PI * R;
  const label = active
    ? task?.title ?? `${MODE_LABEL[mode]}时间`
    : '未在计时';

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex min-w-[380px] items-center gap-5 rounded-full border border-black/5 bg-white/70 px-5 py-3 shadow-xl backdrop-blur-2xl">
        <div className="w-44">
          <p className="truncate text-sm font-semibold text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-400">{MODE_LABEL[mode]}模式</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (status === 'running' ? pauseTimer() : status === 'paused' ? resumeTimer() : undefined)}
            disabled={!active}
            aria-label="播放或暂停"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 active:scale-95 disabled:opacity-40"
          >
            {status === 'running' ? '❚❚' : '▶'}
          </button>
          <button
            onClick={() => endTimer(false)}
            disabled={!active}
            aria-label="结束"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-40"
          >
            ⏹
          </button>
        </div>

        <div className="flex items-center gap-2">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={R} fill="none" stroke="#e8e8ed" strokeWidth="4" />
            <circle
              cx="20" cy="20" r={R} fill="none" stroke="#fa2d48" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)} transform="rotate(-90 20 20)"
            />
          </svg>
          <span className="w-12 text-right font-mono text-sm tabular-nums text-neutral-700">{fmt(remainingSeconds)}</span>
        </div>
      </div>
    </div>
  );
}
```

Add to `client/src/App.tsx` (global 1-second tick):
```tsx
import { useEffect } from 'react';
import { useStore } from './store';
...
export default function App() {
  const status = useStore((s) => s.status);
  const tick = useStore((s) => s.tick);
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [status, tick]);
  ...
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `cd client && npx vitest run`
Expected: PASS.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/PlayerBar.tsx client/src/components/FocusTimer.tsx client/src/components/__tests__/FocusTimer.test.tsx client/src/App.tsx
git commit -m "feat(client): focus timer ring and floating glassmorphism player bar"
```

---

### Task 7: FocusPage

**Files:**
- Modify: `client/src/pages/FocusPage.tsx` (replace stub)

**Interfaces:**
- Consumes: `FocusTimer`, `useStore` (`sessions`, `loadAll`), `PomodoroSession` type.
- Produces: `FocusPage` — header (title + subtitle), centered `FocusTimer`, and a「今日会话」list below showing today's sessions (mode badge, task title, duration, time range). Sessions load via `loadAll` on mount.

- [ ] **Step 1: Implement FocusPage**

`client/src/pages/FocusPage.tsx`:
```tsx
import { useEffect, useMemo } from 'react';
import FocusTimer from '../components/FocusTimer';
import { useStore } from '../store';
import type { PomodoroSession } from '../types';

const MODE_BADGE: Record<string, string> = {
  focus: 'bg-primary/10 text-primary',
  break: 'bg-green-100 text-green-700',
  free: 'bg-amber-100 text-amber-700',
};

const MODE_LABEL: Record<string, string> = { focus: '专注', break: '休息', free: '自由' };

function todaySessions(sessions: PomodoroSession[]): PomodoroSession[] {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = key(new Date());
  return sessions.filter((s) => key(new Date(s.startedAt)) === todayKey);
}

export default function FocusPage() {
  const sessions = useStore((s) => s.sessions);
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => { loadAll(); }, [loadAll]);

  const todays = useMemo(() => todaySessions(sessions), [sessions]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">专注计时</h1>
      <p className="mt-1 text-sm text-neutral-500">心无旁骛，一次只做一件事</p>

      <div className="mt-8 flex justify-center">
        <FocusTimer />
      </div>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-base font-semibold text-neutral-800">今日会话</h2>
        {todays.length === 0 ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
            今天还没有专注记录，开始第一个番茄钟吧 🍅
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {todays.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${MODE_BADGE[s.mode] ?? MODE_BADGE.free}`}>
                    {MODE_LABEL[s.mode] ?? '自由'}
                  </span>
                  <span className="text-sm font-medium text-neutral-800">{s.taskTitle || '未关联任务'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-neutral-900">{s.duration} 分钟</p>
                  <p className="text-xs text-neutral-400">{new Date(s.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/FocusPage.tsx
git commit -m "feat(client): focus page with timer and today sessions list"
```

---

### Task 8: StatsPage (heatmap + KPIs)

**Files:**
- Modify: `client/src/pages/StatsPage.tsx` (replace stub)
- Create: `client/src/pages/__tests__/StatsPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`daily`, `summary`, `loadStats`), `Summary`, `DailyStat`.
- Produces: `StatsPage` — 4 KPI cards (总专注时长 / 总会话数 / 连续打卡 / 今日专注), a 30-day heatmap grid (`grid-cols-10`), and a legend.

- [ ] **Step 1: Write the failing test**

`client/src/pages/__tests__/StatsPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsPage from '../StatsPage';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
  },
}));

beforeEach(() => {
  useStore.setState({
    ...initialStore,
    summary: { totalMinutes: 175, totalSessions: 7, streakDays: 3, todayMinutes: 50 },
    daily: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      minutes: i % 5 === 0 ? 50 : 0,
    })),
  });
  vi.clearAllMocks();
});

describe('StatsPage', () => {
  it('renders 4 KPI cards with formatted values', () => {
    render(<StatsPage />);
    expect(screen.getByText('总专注时长')).toBeTruthy();
    expect(screen.getByText('2h 55m')).toBeTruthy(); // 175 min
    expect(screen.getByText('总会话数')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('连续打卡')).toBeTruthy();
    expect(screen.getByText('3 天')).toBeTruthy();
    expect(screen.getByText('今日专注')).toBeTruthy();
    expect(screen.getByText('50 分钟')).toBeTruthy();
  });

  it('renders a heatmap with 30 cells', () => {
    render(<StatsPage />);
    const cells = document.querySelectorAll('[data-testid="heat-cell"]');
    expect(cells.length).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/pages/__tests__/StatsPage.test.tsx`
Expected: FAIL — StatsPage stub renders nothing.

- [ ] **Step 3: Implement StatsPage**

`client/src/pages/StatsPage.tsx`:
```tsx
import { useEffect } from 'react';
import { useStore } from '../store';

function heatColor(minutes: number): string {
  if (minutes <= 0) return '#e8e8ed';
  if (minutes < 25) return '#ffd3da';
  if (minutes < 50) return '#ff9aa8';
  return '#fa2d48';
}

function formatTotal(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function StatsPage() {
  const daily = useStore((s) => s.daily);
  const summary = useStore((s) => s.summary);
  const loadStats = useStore((s) => s.loadStats);

  useEffect(() => { loadStats(); }, [loadStats]);

  const kpis = [
    { label: '总专注时长', value: formatTotal(summary.totalMinutes), hint: '累计专注分钟数' },
    { label: '总会话数', value: String(summary.totalSessions), hint: '完成的番茄钟' },
    { label: '连续打卡', value: `${summary.streakDays} 天`, hint: '连续专注天数' },
    { label: '今日专注', value: `${summary.todayMinutes} 分钟`, hint: '今天已投入' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">统计</h1>
      <p className="mt-1 text-sm text-neutral-500">回顾你的专注轨迹</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">{k.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{k.value}</p>
            <p className="mt-1 text-xs text-neutral-400">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-800">近 30 天专注热力图</h2>
        <div className="mt-5 grid grid-cols-10 gap-2">
          {daily.map((d) => (
            <div
              key={d.date}
              data-testid="heat-cell"
              title={`${d.date} · ${d.minutes} 分钟`}
              className="aspect-square w-full rounded-[6px] transition hover:scale-110"
              style={{ backgroundColor: heatColor(d.minutes) }}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
          <span>少</span>
          {['#e8e8ed', '#ffd3da', '#ff9aa8', '#fa2d48'].map((c) => (
            <span key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/pages/__tests__/StatsPage.test.tsx`
Expected: PASS.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/StatsPage.tsx client/src/pages/__tests__
git commit -m "feat(client): stats page with KPI cards and 30-day heatmap"
```

---

### Task 9: Integration verification + README

**Files:**
- Create: `README.md` (root)

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Install deps and run the full client test suite**

Run: `cd D:\CheckBox\Astra && npm install && npm test`
Expected: the client test suite passes (api, store, TaskCard, FocusTimer, StatsPage, App smoke).

- [ ] **Step 2: Boot the client and verify it serves**

Run: `npm run dev` (background). Wait for Vite "ready in". Then:
- `curl http://localhost:5173/` → HTML shell.
- Open `http://localhost:5173` in a browser.

- [ ] **Step 3: Manual UI verification checklist**

Using the run skill or a browser at `http://localhost:5173`:
1. 看板: 4 个默认列（待办/进行中/待审核/已完成）；新建任务 → 出现在列中；编辑修改标题；拖拽任务到另一列并刷新页面确认 localStorage 持久化；点击卡片 ⏱ 一键专注跳转到 /focus 且 PlayerBar 显示任务标题。
2. 专注: 切到休息模式显示 05:00；开始 → PlayerBar 显示倒计时；结束 → 任务 pomodoroMinutes 增加、统计页更新。
3. 统计: 显示 4 个 KPI 与 30 格热力图；今日专注 = 刚结束的会话时长。
4. 全局: 侧边栏导航三页切换正常、选中态高亮；PlayerBar 毛玻璃效果、悬浮在底部居中。
5. 刷新页面后数据仍在（localStorage `astra-db`）。

- [ ] **Step 4: Write README**

`README.md`:
```markdown
# Astra

个人生产力 Web 应用：看板任务管理 + 番茄钟专注 + 数据统计。UI 参照 Apple Music Web 的扁平极简风格（毛玻璃播放条、大圆角、深色侧边栏）。

## 技术栈
- React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Zustand + @dnd-kit + react-router-dom
- 纯前端，数据持久化在浏览器 localStorage（键 `astra-db`）。`server/` 为留空壳，无后端 API。

## 快速开始
\`\`\`bash
npm install
npm run dev
\`\`\`
打开 http://localhost:5173

## 脚本
- \`npm run dev\` — 启动前端
- \`npm test\` — 运行客户端测试

## 目录结构
- \`client/\` — React SPA（端口 5173）
- \`server/\` — 空壳（未实现，预留）
```

- [ ] **Step 5: Final commit**

```bash
git add README.md
git commit -m "docs: add README and integration verification"
```

---

## Self-Review Notes

- Frontend-only scope (user override on 2026-08-12): server is an empty shell; all data persistence is localStorage-backed through `services/api.ts`, which keeps the store's expected method signatures so the store code is identical to an HTTP design.
- Spec coverage: Kanban CRUD + drag-drop → Tasks 4-5; focus modes/timer/session recording → Tasks 2, 6, 7; stats heatmap + KPIs → Tasks 2, 8; UI design system → enforced via Global Constraints across Tasks 1, 3, 4, 6, 8.
- Type consistency: `moveTaskToIndex(taskId, columnId, index)` identical in store (Task 2) and KanbanPage (Task 5). `startTimer(mode, taskId?)` consistent across store, TaskCard, FocusTimer. `endTimer(completed)` consistent across store, PlayerBar, FocusTimer. `api.updateTask(id, { columnId, order })` matches the localStorage service in Task 2.
- No placeholders: every code step contains full code. The server shell (Task 1) is intentionally empty per user requirement, not a plan gap.
