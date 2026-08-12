# Astra Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Astra", a personal productivity web app with Kanban task management, Pomodoro focus timers, and daily statistics, styled after Apple Music Web's flat minimal UI with glassmorphism.

**Architecture:** Two independent packages under `D:\CheckBox\Astra\` — `server/` (Express + better-sqlite3 REST API on port 3001) and `client/` (React 18 + Vite + Tailwind SPA on port 5173). Vite proxies `/api` → `localhost:3001`. A root `package.json` uses `concurrently` to run both in dev.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS 3, Framer Motion, Zustand, @dnd-kit, react-router-dom; Node.js, Express, better-sqlite3, cors; vitest + supertest for tests.

## Global Constraints

- **React must be 18.x** (NOT 19). Pin `react@^18.3.1`, `react-dom@^18.3.1`.
- **Tailwind must be 3.x** (config-file based). The project uses `tailwind.config.js` + `postcss.config.js`; do NOT adopt Tailwind 4's CSS-first config.
- **Ports:** frontend dev server on **5173**, backend on **3001**. `client/vite.config.ts` must proxy `/api` → `http://localhost:3001`.
- **UI copy is Chinese** (column names, buttons, empty states, labels).
- **SQLite table names exactly:** `columns`, `tasks`, `pomodoro_sessions`, `daily_activities`, with columns exactly as the design spec (§4). `order` is a reserved-ish keyword — **always quote it as `"order"` in SQL**.
- On startup, seed 4 default columns: 📋待办 / 🚀进行中 / 🔍待审核 / ✅已完成 (only when `columns` is empty). **Start with no other seed data.**
- Enforce `PRAGMA foreign_keys = ON` so column deletion cascades tasks and task deletion cascades sessions.
- Deleting a task removes its `pomodoro_sessions` but keeps `daily_activities` (stats history survives).
- UI design tokens: background `#f5f5f7`, surface `#ffffff`, primary `#fa2d48`, sidebar `#1d1d1f`. Font stack: `SF Pro Display, SF Pro Text, -apple-system, PingFang SC, Microsoft YaHei, sans-serif`. Large radii (`rounded-full`, `rounded-2xl`, `rounded-[18px]`). Buttons `active:scale-95`; cards `hover:scale-1.02`. PlayerBar is a frosted-glass (`backdrop-blur`) floating pill fixed at bottom-center.

---

### Task 1: Server scaffold + DB layer

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/types.ts`
- Create: `server/src/dates.ts`
- Create: `server/src/db.ts`
- Create: `server/test/db.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `initDb(dbPath?: string): DB` and `getDb(): DB` where `DB = better-sqlite3.Database`; `localDate(d: Date): string` and `localDaysAgo(days: number): Date`. Routes in later tasks receive the `DB` instance as a constructor argument.

- [ ] **Step 1: Write the failing test**

`server/test/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, type DB } from '../src/db';

let db: DB;
beforeEach(() => { db = initDb(':memory:'); });

describe('db init', () => {
  it('creates all 4 tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('columns');
    expect(names).toContain('tasks');
    expect(names).toContain('pomodoro_sessions');
    expect(names).toContain('daily_activities');
  });

  it('seeds 4 default columns in order', () => {
    const rows = db.prepare('SELECT title, emoji, "order" FROM columns ORDER BY "order"').all() as { title: string; emoji: string; order: number }[];
    expect(rows.map(r => r.title)).toEqual(['待办', '进行中', '待审核', '已完成']);
    expect(rows[0].emoji).toBe('📋');
  });

  it('does not double-seed on second init', () => {
    initDb(':memory:');
    const count = db.prepare('SELECT COUNT(*) AS c FROM columns').get() as { c: number };
    expect(count.c).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/db.test.ts`
Expected: FAIL with `Cannot find module '../src/db'`.

- [ ] **Step 3: Create server package files**

`server/package.json`:
```json
{
  "name": "astra-server",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.10.0",
    "cors": "^2.8.5",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create types, dates, and db modules**

`server/src/types.ts`:
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
  date: string; // YYYY-MM-DD local
  minutes: number;
}

export interface Summary {
  totalMinutes: number;
  totalSessions: number;
  streakDays: number;
  todayMinutes: number;
}
```

`server/src/dates.ts` (uses **local** timezone, never UTC — critical for Chinese users):
```ts
export function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns a Date `days` days before today (today = 0). */
export function localDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
```

`server/src/db.ts`:
```ts
import Database from 'better-sqlite3';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '📌',
  accentColor TEXT NOT NULL DEFAULT '#fa2d48'
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  columnId INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium',
  pomodoroMinutes INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  dueDate TEXT,
  completedAt TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  taskTitle TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT NOT NULL,
  finishedAt TEXT,
  mode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_activities (
  date TEXT PRIMARY KEY,
  minutes INTEGER NOT NULL DEFAULT 0
);
`;

const DEFAULT_COLUMNS = [
  { title: '待办', emoji: '📋', accentColor: '#fa2d48' },
  { title: '进行中', emoji: '🚀', accentColor: '#ff9500' },
  { title: '待审核', emoji: '🔍', accentColor: '#5856d6' },
  { title: '已完成', emoji: '✅', accentColor: '#34c759' },
];

let db: DB | null = null;

export function initDb(dbPath: string = ':memory:'): DB {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  const count = db.prepare('SELECT COUNT(*) AS c FROM columns').get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO columns (title, emoji, accentColor, "order") VALUES (?, ?, ?, ?)');
    DEFAULT_COLUMNS.forEach((col, i) => insert.run(col.title, col.emoji, col.accentColor, i));
  }
  return db;
}

export function getDb(): DB {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

- [ ] **Step 5: Install deps and run test to verify it passes**

Run: `cd server && npm install && npx vitest run test/db.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "feat(server): scaffold server with sqlite schema, seed columns, dates util"
```

---

### Task 2: Express app factory + Columns API

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/src/routes/columns.ts`
- Create: `server/test/columns.test.ts`

**Interfaces:**
- Consumes: `initDb`, `DB` from `src/db`.
- Produces: `createApp(db: DB): express.Express` — the full Express app with JSON + CORS middleware and all `/api/*` routers mounted (routers for tasks/focus/stats added in later tasks; mount them now, importing from their route files, which Task 3-5 create). `index.ts` boots the app on port 3001.
- Produces route factory pattern used by all route files: `export function createColumnsRouter(db: DB): Router`.

- [ ] **Step 1: Write the failing test**

`server/test/columns.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, type DB } from '../src/db';
import { createApp } from '../src/app';
import request from 'supertest';

let app: ReturnType<typeof createApp>;
let db: DB;
beforeEach(() => { db = initDb(':memory:'); app = createApp(db); });

describe('GET /api/columns', () => {
  it('returns the 4 default columns ordered', async () => {
    const res = await request(app).get('/api/columns');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toMatchObject({ title: '待办', emoji: '📋', order: 0 });
    expect(res.body[3]).toMatchObject({ title: '已完成' });
  });
});

describe('POST /api/columns', () => {
  it('creates a column with defaults', async () => {
    const res = await request(app).post('/api/columns').send({ title: '新列', emoji: '🎯' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: '新列', emoji: '🎯', order: 4 });
  });
  it('rejects missing title with 400', async () => {
    const res = await request(app).post('/api/columns').send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/columns/:id', () => {
  it('renames and reorders a column', async () => {
    const created = await request(app).post('/api/columns').send({ title: 'X' });
    const res = await request(app).put(`/api/columns/${created.body.id}`).send({ title: 'Y', order: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Y', order: 0 });
  });
  it('404 for unknown id', async () => {
    const res = await request(app).put('/api/columns/999').send({ title: 'Y' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/columns/:id', () => {
  it('deletes the column and cascades its tasks via FK', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    // Insert a task directly into the DB — the tasks API arrives in Task 3.
    db.prepare('INSERT INTO tasks (title, columnId, createdAt) VALUES (?, ?, ?)')
      .run('T', cols[0].id, new Date().toISOString());
    const res = await request(app).delete(`/api/columns/${cols[0].id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const count = db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number };
    expect(count.c).toBe(0);
  });
  it('404 for unknown id', async () => {
    const res = await request(app).delete('/api/columns/999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/columns.test.ts`
Expected: FAIL — `Cannot find module '../src/app'` and tasks router missing.

- [ ] **Step 3: Create app factory and index**

`server/src/app.ts`:
```ts
import express from 'express';
import cors from 'cors';
import type { DB } from './db';
import { createColumnsRouter } from './routes/columns';
import { createTasksRouter } from './routes/tasks';
import { createFocusRouter } from './routes/focus';
import { createStatsRouter } from './routes/stats';

export function createApp(db: DB): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/columns', createColumnsRouter(db));
  app.use('/api/tasks', createTasksRouter(db));
  app.use('/api/focus', createFocusRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  return app;
}
```

`server/src/index.ts`:
```ts
import { initDb } from './db';
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3001;
const db = initDb('astra.db');
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Astra API listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Create columns router**

`server/src/routes/columns.ts`:
```ts
import { Router } from 'express';
import type { DB } from '../db';

export function createColumnsRouter(db: DB): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const columns = db.prepare('SELECT * FROM columns ORDER BY "order" ASC').all();
    res.json(columns);
  });

  router.post('/', (req, res) => {
    const { title, emoji = '📌', accentColor = '#fa2d48' } = req.body ?? {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const max = db.prepare('SELECT COALESCE(MAX("order"), -1) AS m FROM columns').get() as { m: number };
    const info = db
      .prepare('INSERT INTO columns (title, emoji, accentColor, "order") VALUES (?, ?, ?, ?)')
      .run(title, emoji, accentColor, max.m + 1);
    res.status(201).json(db.prepare('SELECT * FROM columns WHERE id = ?').get(info.lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Column not found' });
    const { title, emoji, accentColor, order } = req.body ?? {};
    db.prepare(
      `UPDATE columns SET title = COALESCE(?, title), emoji = COALESCE(?, emoji),
       accentColor = COALESCE(?, accentColor), "order" = COALESCE(?, "order") WHERE id = ?`
    ).run(title ?? null, emoji ?? null, accentColor ?? null, order ?? null, id);
    res.json(db.prepare('SELECT * FROM columns WHERE id = ?').get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Column not found' });
    db.prepare('DELETE FROM columns WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 5: Create placeholder routers for tasks/focus/stats**

These are fully implemented in Tasks 3-5. For now create each file exporting a factory that returns an empty router, so `app.ts` compiles and the columns test runs:

`server/src/routes/tasks.ts`:
```ts
import { Router } from 'express';
import type { DB } from '../db';

export function createTasksRouter(db: DB): Router {
  const router = Router();
  // Implemented in Task 3
  return router;
}
```
Do the same shape for `server/src/routes/focus.ts` and `server/src/routes/stats.ts` (they will be replaced in Tasks 4 and 5).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npx vitest run test/columns.test.ts test/db.test.ts`
Expected: PASS (all tests). The DELETE cascade test needs `foreign_keys = ON` — `initDb` already sets it.

- [ ] **Step 7: Commit**

```bash
git add server/src server/test
git commit -m "feat(server): express app factory and columns CRUD API"
```

---

### Task 3: Tasks API

**Files:**
- Modify: `server/src/routes/tasks.ts` (replace placeholder)
- Create: `server/test/tasks.test.ts`

**Interfaces:**
- Consumes: `DB` from `src/db`.
- Produces: `createTasksRouter(db)` with `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`. `GET /` supports optional `?columnId=` filter. `PUT /:id` accepts partial fields including `{ columnId, order }` (used by drag-and-drop), and validates `columnId` if present.

- [ ] **Step 1: Write the failing test**

`server/test/tasks.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, type DB } from '../src/db';
import { createApp } from '../src/app';
import request from 'supertest';

let app: ReturnType<typeof createApp>;
let db: DB;
let todoId: number;

beforeEach(async () => {
  db = initDb(':memory:');
  app = createApp(db);
  const cols = (await request(app).get('/api/columns')).body as { id: number; title: string }[];
  todoId = cols[0].id;
});

describe('POST /api/tasks', () => {
  it('creates a task with defaults', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '写周报', columnId: todoId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: '写周报', columnId: todoId, priority: 'medium', pomodoroMinutes: 0, order: 0 });
  });
  it('rejects missing title', async () => {
    const res = await request(app).post('/api/tasks').send({ columnId: todoId });
    expect(res.status).toBe(400);
  });
  it('404 for unknown column', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'T', columnId: 999 });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tasks', () => {
  it('returns tasks ordered by "order"', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', columnId: todoId });
    await request(app).post('/api/tasks').send({ title: 'B', columnId: todoId });
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.map((t: { title: string }) => t.title)).toEqual(['A', 'B']);
  });
  it('filters by columnId', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    await request(app).post('/api/tasks').send({ title: 'A', columnId: todoId });
    await request(app).post('/api/tasks').send({ title: 'B', columnId: cols[1].id });
    const res = await request(app).get(`/api/tasks?columnId=${todoId}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('A');
  });
});

describe('PUT /api/tasks/:id', () => {
  it('updates fields and persists order for drag-drop', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'A', columnId: todoId });
    const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ title: 'A2', priority: 'high', order: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'A2', priority: 'high', order: 5 });
  });
  it('moves task to another column', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    const created = await request(app).post('/api/tasks').send({ title: 'A', columnId: todoId });
    const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ columnId: cols[1].id, order: 0 });
    expect(res.status).toBe(200);
    expect(res.body.columnId).toBe(cols[1].id);
  });
  it('404 for unknown task', async () => {
    const res = await request(app).put('/api/tasks/999').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes the task', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'A', columnId: todoId });
    const res = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const tasks = await request(app).get('/api/tasks');
    expect(tasks.body).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/tasks.test.ts`
Expected: FAIL — routes are empty placeholders.

- [ ] **Step 3: Implement the tasks router**

Replace `server/src/routes/tasks.ts` with:
```ts
import { Router } from 'express';
import type { DB } from '../db';

export function createTasksRouter(db: DB): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const columnId = req.query.columnId ? Number(req.query.columnId) : undefined;
    const rows = columnId
      ? db.prepare('SELECT * FROM tasks WHERE columnId = ? ORDER BY "order" ASC').all(columnId)
      : db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all();
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const { title, description = '', columnId, priority = 'medium', dueDate = null } = req.body ?? {};
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
    if (!Number.isInteger(columnId)) return res.status(400).json({ error: 'columnId is required' });
    const col = db.prepare('SELECT id FROM columns WHERE id = ?').get(columnId);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    const max = db.prepare('SELECT COALESCE(MAX("order"), -1) AS m FROM tasks WHERE columnId = ?').get(columnId) as { m: number };
    const createdAt = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO tasks (title, description, columnId, priority, "order", dueDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(title, description, columnId, priority, max.m + 1, dueDate, createdAt);
    res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const { title, description, columnId, priority, dueDate, order, completedAt, pomodoroMinutes } = req.body ?? {};
    if (columnId != null && !Number.isInteger(columnId)) return res.status(400).json({ error: 'invalid columnId' });
    if (columnId != null) {
      const col = db.prepare('SELECT id FROM columns WHERE id = ?').get(columnId);
      if (!col) return res.status(404).json({ error: 'Column not found' });
    }
    db.prepare(
      `UPDATE tasks SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         columnId = COALESCE(?, columnId),
         priority = COALESCE(?, priority),
         dueDate = COALESCE(?, dueDate),
         "order" = COALESCE(?, "order"),
         completedAt = COALESCE(?, completedAt),
         pomodoroMinutes = COALESCE(?, pomodoroMinutes)
       WHERE id = ?`
    ).run(title ?? null, description ?? null, columnId ?? null, priority ?? null, dueDate ?? null, order ?? null, completedAt ?? null, pomodoroMinutes ?? null, id);
    res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run test/tasks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/tasks.ts server/test/tasks.test.ts
git commit -m "feat(server): tasks CRUD API with column filtering and drag-drop order updates"
```

---

### Task 4: Focus sessions API

**Files:**
- Modify: `server/src/routes/focus.ts` (replace placeholder)
- Create: `server/test/focus.test.ts`

**Interfaces:**
- Consumes: `DB`, `localDate` from `src/dates`.
- Produces: `createFocusRouter(db)` with:
  - `POST /start` — body `{ mode, taskId?, taskTitle? }` → `201 { id, startedAt }`. Validates mode ∈ {focus, break, free}; resolves taskTitle from the task when `taskId` given; 404 if taskId points to missing task.
  - `POST /end` — body `{ id, duration, completed }` → `{ ok: true }`. Sets duration/completed/finishedAt; if completed and duration>0, adds duration to the task's `pomodoroMinutes` and upserts `daily_activities` for the local date. 404 if session missing.
  - `GET /sessions` — latest 50 sessions, `completed` converted to boolean, ordered by `startedAt DESC`.

- [ ] **Step 1: Write the failing test**

`server/test/focus.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, type DB } from '../src/db';
import { createApp } from '../src/app';
import request from 'supertest';

let app: ReturnType<typeof createApp>;
let db: DB;

beforeEach(async () => {
  db = initDb(':memory:');
  app = createApp(db);
});

describe('POST /api/focus/start', () => {
  it('starts a session and resolves taskTitle from task', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    const task = await request(app).post('/api/tasks').send({ title: '读书', columnId: cols[0].id });
    const res = await request(app).post('/api/focus/start').send({ mode: 'focus', taskId: task.body.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: res.body.id });
    expect(typeof res.body.startedAt).toBe('string');
  });
  it('rejects invalid mode', async () => {
    const res = await request(app).post('/api/focus/start').send({ mode: 'sprint' });
    expect(res.status).toBe(400);
  });
  it('404 when task does not exist', async () => {
    const res = await request(app).post('/api/focus/start').send({ mode: 'focus', taskId: 999 });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/focus/end', () => {
  it('records session and accumulates task pomodoroMinutes', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    const task = await request(app).post('/api/tasks').send({ title: '读书', columnId: cols[0].id });
    const started = await request(app).post('/api/focus/start').send({ mode: 'focus', taskId: task.body.id });
    const res = await request(app).post('/api/focus/end').send({ id: started.body.id, duration: 25, completed: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const updated = await request(app).get(`/api/tasks`).then(r => r.body.find((t: { id: number }) => t.id === task.body.id));
    expect(updated.pomodoroMinutes).toBe(25);
  });

  it('adds to daily_activities for completed sessions', async () => {
    const started = await request(app).post('/api/focus/start').send({ mode: 'free' });
    await request(app).post('/api/focus/end').send({ id: started.body.id, duration: 30, completed: true });
    // Assert the side effect directly in the DB — the stats API arrives in Task 5.
    const row = db.prepare('SELECT minutes FROM daily_activities').get() as { minutes: number };
    expect(row.minutes).toBe(30);
  });

  it('does not accumulate when aborted (completed=false)', async () => {
    const cols = (await request(app).get('/api/columns')).body as { id: number }[];
    const task = await request(app).post('/api/tasks').send({ title: '读书', columnId: cols[0].id });
    const started = await request(app).post('/api/focus/start').send({ mode: 'focus', taskId: task.body.id });
    await request(app).post('/api/focus/end').send({ id: started.body.id, duration: 5, completed: false });
    const updated = await request(app).get('/api/tasks').then(r => r.body.find((t: { id: number }) => t.id === task.body.id));
    expect(updated.pomodoroMinutes).toBe(0);
  });
});

describe('GET /api/focus/sessions', () => {
  it('returns sessions newest first with boolean completed', async () => {
    const s1 = await request(app).post('/api/focus/start').send({ mode: 'focus' });
    await request(app).post('/api/focus/end').send({ id: s1.body.id, duration: 10, completed: true });
    const s2 = await request(app).post('/api/focus/start').send({ mode: 'break' });
    const res = await request(app).get('/api/focus/sessions');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: s2.body.id, completed: false });
    expect(res.body[1]).toMatchObject({ id: s1.body.id, completed: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/focus.test.ts`
Expected: FAIL — empty router.

- [ ] **Step 3: Implement the focus router**

Replace `server/src/routes/focus.ts` with:
```ts
import { Router } from 'express';
import type { DB } from '../db';
import { localDate } from '../dates';

const MODES = ['focus', 'break', 'free'] as const;

export function createFocusRouter(db: DB): Router {
  const router = Router();

  router.post('/start', (req, res) => {
    const { mode = 'focus', taskId = null, taskTitle = '' } = req.body ?? {};
    if (!MODES.includes(mode)) return res.status(400).json({ error: 'invalid mode' });
    let title = typeof taskTitle === 'string' ? taskTitle : '';
    if (taskId != null) {
      const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as { title: string } | undefined;
      if (!task) return res.status(404).json({ error: 'Task not found' });
      title = task.title;
    }
    const startedAt = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO pomodoro_sessions (taskId, taskTitle, duration, completed, startedAt, mode) VALUES (?, ?, 0, 0, ?, ?)')
      .run(taskId ?? null, title, startedAt, mode);
    res.status(201).json({ id: Number(info.lastInsertRowid), startedAt });
  });

  router.post('/end', (req, res) => {
    const { id, duration = 0, completed = false } = req.body ?? {};
    const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id) as
      | { id: number; taskId: number | null }
      | undefined;
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const finishedAt = new Date().toISOString();
    db.prepare('UPDATE pomodoro_sessions SET duration = ?, completed = ?, finishedAt = ? WHERE id = ?')
      .run(duration, completed ? 1 : 0, finishedAt, id);
    if (completed && duration > 0) {
      if (session.taskId != null) {
        db.prepare('UPDATE tasks SET pomodoroMinutes = pomodoroMinutes + ? WHERE id = ?').run(duration, session.taskId);
      }
      const date = localDate(new Date());
      db.prepare(
        `INSERT INTO daily_activities (date, minutes) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET minutes = minutes + ?`
      ).run(date, duration, duration);
    }
    res.json({ ok: true });
  });

  router.get('/sessions', (_req, res) => {
    const rows = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY startedAt DESC LIMIT 50').all() as {
      id: number; taskId: number | null; taskTitle: string; duration: number; completed: number;
      startedAt: string; finishedAt: string | null; mode: string;
    }[];
    res.json(rows.map(r => ({ ...r, completed: !!r.completed })));
  });

  return router;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run test/focus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/focus.ts server/test/focus.test.ts
git commit -m "feat(server): focus session start/end API with task minutes accumulation"
```

---

### Task 5: Stats API

**Files:**
- Modify: `server/src/routes/stats.ts` (replace placeholder)
- Create: `server/test/stats.test.ts`

**Interfaces:**
- Consumes: `DB`, `localDate`, `localDaysAgo`.
- Produces: `createStatsRouter(db)` with:
  - `GET /daily?days=30` → `DailyStat[]` — exactly `days` entries (default 30, clamped 1..90), each `{ date: 'YYYY-MM-DD', minutes: number }`, oldest first, missing days as 0.
  - `GET /summary` → `{ totalMinutes, totalSessions, streakDays, todayMinutes }`. `totalMinutes`/`totalSessions` count only completed sessions. `streakDays`: consecutive days ending today (or yesterday if today has 0) where `daily_activities.minutes > 0`. `todayMinutes` from `daily_activities`.

- [ ] **Step 1: Write the failing test**

`server/test/stats.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, type DB } from '../src/db';
import { createApp } from '../src/app';
import request from 'supertest';

let app: ReturnType<typeof createApp>;
let db: DB;

beforeEach(async () => {
  db = initDb(':memory:');
  app = createApp(db);
});

async function addCompletedSession(duration: number) {
  const started = await request(app).post('/api/focus/start').send({ mode: 'free' });
  await request(app).post('/api/focus/end').send({ id: started.body.id, duration, completed: true });
}

describe('GET /api/stats/daily', () => {
  it('returns days entries oldest-first, zero for empty days', async () => {
    await addCompletedSession(30);
    const res = await request(app).get('/api/stats/daily?days=7');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
    expect(res.body[res.body.length - 1].minutes).toBe(30);
    expect(res.body[0].minutes).toBe(0);
  });
  it('clamps days to 90', async () => {
    const res = await request(app).get('/api/stats/daily?days=500');
    expect(res.body).toHaveLength(90);
  });
  it('defaults to 30 days', async () => {
    const res = await request(app).get('/api/stats/daily');
    expect(res.body).toHaveLength(30);
  });
});

describe('GET /api/stats/summary', () => {
  it('returns zeroed summary for empty db', async () => {
    const res = await request(app).get('/api/stats/summary');
    expect(res.body).toEqual({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 });
  });
  it('totals completed sessions only', async () => {
    await addCompletedSession(25);
    await addCompletedSession(25);
    const s = await request(app).post('/api/focus/start').send({ mode: 'free' });
    await request(app).post('/api/focus/end').send({ id: s.body.id, duration: 10, completed: false });
    const res = await request(app).get('/api/stats/summary');
    expect(res.body.totalMinutes).toBe(50);
    expect(res.body.totalSessions).toBe(2);
    expect(res.body.todayMinutes).toBe(50);
    expect(res.body.streakDays).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/stats.test.ts`
Expected: FAIL — empty router.

- [ ] **Step 3: Implement the stats router**

Replace `server/src/routes/stats.ts` with:
```ts
import { Router } from 'express';
import type { DB } from '../db';
import { localDate, localDaysAgo } from '../dates';

export function createStatsRouter(db: DB): Router {
  const router = Router();

  router.get('/daily', (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const rows = db.prepare('SELECT date, minutes FROM daily_activities').all() as { date: string; minutes: number }[];
    const byDate = new Map(rows.map(r => [r.date, r.minutes]));
    const result: { date: string; minutes: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = localDate(localDaysAgo(i));
      result.push({ date: key, minutes: byDate.get(key) ?? 0 });
    }
    res.json(result);
  });

  router.get('/summary', (_req, res) => {
    const totals = db
      .prepare('SELECT COALESCE(SUM(duration), 0) AS totalMinutes, COUNT(*) AS totalSessions FROM pomodoro_sessions WHERE completed = 1')
      .get() as { totalMinutes: number; totalSessions: number };
    const today = localDate(new Date());
    const todayRow = db.prepare('SELECT minutes FROM daily_activities WHERE date = ?').get(today) as
      | { minutes: number }
      | undefined;
    const todayMinutes = todayRow?.minutes ?? 0;
    const positiveDays = new Set(
      (db.prepare('SELECT date FROM daily_activities WHERE minutes > 0').all() as { date: string }[]).map(r => r.date)
    );
    let streak = 0;
    let cursor = new Date();
    if (!positiveDays.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1); // today empty → count from yesterday
    while (positiveDays.has(localDate(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    res.json({
      totalMinutes: totals.totalMinutes,
      totalSessions: totals.totalSessions,
      streakDays: streak,
      todayMinutes,
    });
  });

  return router;
}
```

- [ ] **Step 4: Run the full server test suite**

Run: `cd server && npx vitest run`
Expected: PASS — all 5 test files (db, columns, tasks, focus, stats) green.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/stats.ts server/test/stats.test.ts
git commit -m "feat(server): stats daily aggregation and summary API"
```

---

### Task 6: Client scaffold (Vite + Tailwind + Router shell)

**Files:**
- Create: `package.json` (root, with concurrently)
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
- Produces: App shell with React Router (`/`, `/focus`, `/stats` routes), the global sidebar + content + PlayerBar layout, and design tokens in Tailwind + CSS. Later tasks fill in the pages and components (create `pages/KanbanPage.tsx`, `pages/FocusPage.tsx`, `pages/StatsPage.tsx` as minimal stubs now so routing compiles).

- [ ] **Step 1: Write the failing smoke test**

`client/src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// NOTE: At this task the pages/Sidebar/PlayerBar are stubs and App does not
// touch the store yet, so no mocking is needed. Sidebar labels are asserted
// once Sidebar is implemented in Task 8.

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

- [ ] **Step 3: Create root and client package files**

Root `package.json`:
```json
{
  "name": "astra",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n server,client -c blue,magenta \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "server": "npm run dev --prefix server",
    "client": "npm run dev --prefix client",
    "test": "npm run test --prefix server && npm run test --prefix client"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

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
    proxy: {
      '/api': 'http://localhost:3001',
    },
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

- [ ] **Step 4: Create Tailwind + PostCSS + HTML**

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

- [ ] **Step 5: Create global CSS with design tokens**

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

- [ ] **Step 6: Create main entry, App shell, and page stubs**

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

Create minimal stubs so the shell compiles (each replaced in Tasks 8-13):
- `client/src/components/Sidebar.tsx` → `export default function Sidebar() { return <aside>Sidebar</aside>; }`
- `client/src/components/PlayerBar.tsx` → `export default function PlayerBar() { return <div />; }`
- `client/src/pages/KanbanPage.tsx` → `export default function KanbanPage() { return <div />; }`
- `client/src/pages/FocusPage.tsx` → `export default function FocusPage() { return <div />; }`
- `client/src/pages/StatsPage.tsx` → `export default function StatsPage() { return <div />; }`

- [ ] **Step 7: Install deps and verify test + build pass**

Run: `cd client && npm install && npx vitest run src/App.test.tsx`
Expected: PASS (smoke test).

Run: `cd client && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add package.json client
git commit -m "feat(client): scaffold vite react ts tailwind with router shell and smoke test"
```

---

### Task 7: Client data layer (types + API + Zustand store)

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/services/api.ts`
- Create: `client/src/store/index.ts`
- Create: `client/src/store/__tests__/store.test.ts`

**Interfaces:**
- Consumes: server API shapes from the spec.
- Produces:
  - `types/index.ts` exporting `Column`, `Task`, `PomodoroSession`, `DailyStat`, `Summary` (mirror server `types.ts`).
  - `services/api.ts` exporting `api` object with methods: `getColumns`, `createColumn`, `updateColumn`, `deleteColumn`, `getTasks`, `createTask`, `updateTask`, `deleteTask`, `startFocusSession(mode, taskId?)`, `endFocusSession(id, duration, completed)`, `getSessions`, `getDaily(days)`, `getSummary`.
  - `store/index.ts` exporting `useStore` (a zustand store) and `initialStore` (for test resets). See full shape below.

- [ ] **Step 1: Write the failing store test**

`client/src/store/__tests__/store.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, initialStore, MODE_MINUTES } from '../index';
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

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/store/__tests__/store.test.ts`
Expected: FAIL — modules missing.

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

- [ ] **Step 4: Create the API service**

`client/src/services/api.ts`:
```ts
import type { Column, Task, PomodoroSession, DailyStat, Summary } from '../types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getColumns: () => request<Column[]>('/columns'),
  createColumn: (data: { title: string; emoji?: string; accentColor?: string }) =>
    request<Column>('/columns', { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (id: number, data: Partial<Column>) =>
    request<Column>(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColumn: (id: number) => request<{ ok: boolean }>(`/columns/${id}`, { method: 'DELETE' }),

  getTasks: (columnId?: number) =>
    request<Task[]>(`/tasks${columnId != null ? `?columnId=${columnId}` : ''}`),
  createTask: (data: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) => request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  startFocusSession: (mode: string, taskId?: number | null) =>
    request<{ id: number; startedAt: string }>('/focus/start', {
      method: 'POST',
      body: JSON.stringify({ mode, taskId: taskId ?? null }),
    }),
  endFocusSession: (id: number, duration: number, completed: boolean) =>
    request<{ ok: boolean }>('/focus/end', {
      method: 'POST',
      body: JSON.stringify({ id, duration, completed }),
    }),
  getSessions: () => request<PomodoroSession[]>('/focus/sessions'),

  getDaily: (days = 30) => request<DailyStat[]>(`/stats/daily?days=${days}`),
  getSummary: () => request<Summary>('/stats/summary'),
};
```

- [ ] **Step 5: Create the Zustand store**

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

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd client && npx vitest run src/store/__tests__/store.test.ts src/App.test.tsx`
Expected: PASS.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/types client/src/services client/src/store
git commit -m "feat(client): types, api service, and zustand store with timer + moveTask logic"
```

---

### Task 8: Sidebar + SearchBar

**Files:**
- Modify: `client/src/components/Sidebar.tsx`
- Create: `client/src/components/SearchBar.tsx`

**Interfaces:**
- Consumes: `useStore` (only `summary.todayMinutes` for the welcome line), `NavLink` from react-router-dom.
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

### Task 9: TaskCard + TaskModal

**Files:**
- Create: `client/src/components/TaskCard.tsx`
- Create: `client/src/components/TaskModal.tsx`
- Create: `client/src/components/__tests__/TaskCard.test.tsx`

**Interfaces:**
- Consumes: `Task`, `Column` types; `useStore` (`tasks`, `columns`, `deleteTask`, `updateTask`, `createTask`, `startTimer`); `useNavigate` for "一键专注" (navigates to `/focus` after starting).
- Produces:
  - `TaskCard({ task, onEdit }: { task: Task; onEdit: (task: Task) => void })` — draggable card; rendered inside a `SortableTaskCard` wrapper in Task 10 that adds `useSortable` props. Buttons: 编辑 (opens modal), ⏱ 专注 (starts timer for task and navigates to /focus), 删除 (confirm then `deleteTask`).
  - `TaskModal({ open, onClose, task?, columns }: { open: boolean; onClose: () => void; task?: Task | null; columns: Column[] })` — form: 标题, 描述, 优先级 (3 pills), 截止日期 (date input), 所属列 (select). Save creates or updates via store.
  - `useTaskForm()` is NOT exported — form state lives inside TaskModal.

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

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
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
    <article className="group cursor-grab rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:scale-1.02 hover:shadow-md active:cursor-grabbing">
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

### Task 10: KanbanPage (5-column grid + drag-and-drop)

**Files:**
- Modify: `client/src/pages/KanbanPage.tsx` (replace stub)
- Create: `client/src/components/SortableTaskCard.tsx`

**Interfaces:**
- Consumes: `useStore` (`columns`, `tasks`, `moveTaskToIndex`), `TaskCard`, `TaskModal`, `SearchBar`, `@dnd-kit` (`DndContext`, `PointerSensor`, `closestCorners`), `@dnd-kit/sortable` (`SortableContext`, `verticalListSortingStrategy`, `useSortable`, `CSS`), Framer Motion (`AnimatePresence`, `motion`).
- Produces: `KanbanPage` — top bar (title + 新建任务 + SearchBar), horizontal 5-column grid (`grid-cols-5` on `xl`, fallback horizontal scroll), per-column `SortableContext`, drag overlay, TaskModal wiring.
- Produces: `SortableTaskCard({ task, onEdit })` — `useSortable` wrapper around `TaskCard` (passes `setNodeRef`, `style`, `attributes`, `listeners` to the card). Because TaskCard's root is an `<article>`, TaskCard must forward props; simplest approach: SortableTaskCard clones with a wrapper that spreads listeners, OR TaskCard accepts optional `dragHandleProps`/`style`/`setNodeRef`. **Decision: TaskCard accepts `dragOverlay?: boolean` and spreadable props via `forwardRef` + `...rest` on the `<article>`.** Modify TaskCard accordingly in this task.

- [ ] **Step 1: Make TaskCard drag-ready**

Modify `client/src/components/TaskCard.tsx`:
- Change the component signature to `forwardRef<HTMLElement, TaskCardProps & React.HTMLAttributes<HTMLElement>>` and spread `...rest` onto the `<article>`, so `setNodeRef`, `attributes`, `listeners`, `style` from `useSortable` can be passed through:
```tsx
import { forwardRef } from 'react';

interface TaskCardProps extends React.HTMLAttributes<HTMLElement> {
  task: Task;
  onEdit: (task: Task) => void;
}

const TaskCard = forwardRef<HTMLElement, TaskCardProps>(function TaskCard({ task, onEdit, ...rest }, ref) {
  ...
  return (
    <article ref={ref} {...rest} className="group ...">
  );
});
export default TaskCard;
```

- [ ] **Step 2: Create SortableTaskCard**

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

- [ ] **Step 3: Implement KanbanPage**

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
                      onClick={() => { setEditing(null); setModalOpen(true); useStore.setState((s) => ({ modalDefaultColumn: column.id })); }}
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

Note on the "add to column" button: it sets the store's one-shot `modalDefaultColumn` hint (defined in Task 7's `initialStore`), and TaskModal (Task 9) already consumes it — when opening in create-mode it defaults the column to that hint or the first column.

- [ ] **Step 4: Verify typecheck + build**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

Run: `cd client && npx vitest run`
Expected: PASS (all existing client tests still green).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/KanbanPage.tsx client/src/components/SortableTaskCard.tsx client/src/components/TaskCard.tsx client/src/store/index.ts
git commit -m "feat(client): kanban board with 5-column grid and cross-column drag-drop"
```

---

### Task 11: FocusTimer + PlayerBar

**Files:**
- Modify: `client/src/components/PlayerBar.tsx` (replace stub)
- Create: `client/src/components/FocusTimer.tsx`
- Create: `client/src/components/__tests__/FocusTimer.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`status`, `mode`, `totalSeconds`, `remainingSeconds`, `taskId`, `tasks`, `setMode`, `startTimer`, `pauseTimer`, `resumeTimer`, `endTimer`), react-router `useNavigate`.
- Produces:
  - `FocusTimer` — big SVG progress ring + mm:ss + mode pills (专注/休息/自由) + task `<select>` + start/pause/resume/reset buttons. Uses `MODE_MINUTES` for labels (专注 25 分钟 / 休息 5 分钟 / 自由 25 分钟).
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

### Task 12: FocusPage

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
  const today = new Date();
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = key(today);
  return sessions.filter((s) => key(new Date(s.startedAt)).slice(0, 10) === todayKey);
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

### Task 13: StatsPage (heatmap + KPIs)

**Files:**
- Modify: `client/src/pages/StatsPage.tsx` (replace stub)
- Create: `client/src/pages/__tests__/StatsPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`daily`, `summary`, `loadStats`), `Summary`, `DailyStat`.
- Produces: `StatsPage` — 4 KPI cards (总专注时长 / 总会话数 / 连续打卡 / 今日专注), a 30-day heatmap grid (`grid-cols-10`), weekday/month context line, and a legend.

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

### Task 14: Integration verification + README

**Files:**
- Create: `README.md` (root)
- Create: `server/src/index.ts` (already exists from Task 2 — verify boot path; no change expected)

**Interfaces:**
- Consumes: everything.
- Produces: verified end-to-end runnable app + developer docs.

- [ ] **Step 1: Install all deps and run both test suites**

Run: `cd D:\CheckBox\Astra && npm install && npm run test`
Expected: both server and client test suites pass (no failures).

- [ ] **Step 2: Boot the full stack and verify the API end-to-end**

Run: `npm run dev` (background). Wait for "Astra API listening on http://localhost:3001" and Vite "ready in".
Then verify with curl:
- `curl http://localhost:3001/api/columns` → 4 default columns.
- `curl -X POST http://localhost:3001/api/tasks -H "Content-Type: application/json" -d '{"title":"端到端测试","columnId":1}'` → 201 with task.
- `curl http://localhost:5173/` → HTML shell (Vite serving).
Then stop the dev server.

- [ ] **Step 3: Manual UI verification checklist**

Using the run skill or a browser at `http://localhost:5173`:
1. 看板: 新建任务 → 出现在「待办」列；编辑修改标题；拖拽任务到「进行中」列并刷新页面确认持久化；点击卡片 ⏱ 一键专注跳转到 /focus 且 PlayerBar 显示任务标题。
2. 专注: 切到休息模式显示 05:00；开始 → PlayerBar 显示倒计时；结束 → 任务 pomodoroMinutes 增加、统计页更新。
3. 统计: 显示 4 个 KPI 与 30 格热力图；今日专注 = 刚结束的会话时长。
4. 全局: 侧边栏导航三页切换正常、选中态高亮；PlayerBar 毛玻璃效果、悬浮在底部居中。

- [ ] **Step 4: Write README**

`README.md`:
```markdown
# Astra

个人生产力 Web 应用：看板任务管理 + 番茄钟专注 + 数据统计。UI 参照 Apple Music Web 的扁平极简风格。

## 技术栈
- 前端：React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Zustand + @dnd-kit + react-router-dom
- 后端：Node.js + Express + better-sqlite3 (SQLite)

## 快速开始
\`\`\`bash
npm install          # 安装根、server、client 依赖
npm run dev          # 同时启动后端(3001)和前端(5173)
\`\`\`
打开 http://localhost:5173

## 脚本
- \`npm run dev\` — 一键启动前后端
- \`npm run server\` / \`npm run client\` — 单独启动
- \`npm test\` — 运行前后端全部测试

## 目录结构
- \`server/\` — Express + better-sqlite3 API（端口 3001）
- \`client/\` — React SPA（端口 5173，/api 代理到 3001）
```

- [ ] **Step 5: Final commit**

```bash
git add README.md
git commit -m "docs: add README and integration verification"
```

---

## Self-Review Notes

- Spec §4 data model → Task 1 (schema). Spec §5 API → Tasks 2-5. Spec §6 frontend → Tasks 6-13. Spec §7 UI design system → enforced across Tasks 6, 8, 9, 11, 13 via the Global Constraints tokens. Spec §8 pages → Tasks 10, 12, 13. Spec §9 error handling → store `try/catch` + console.error in Task 7. Spec §10 non-goals → nothing built. Spec §11 acceptance → Task 14.
- Placeholder risk: the three placeholder routers in Task 2 are intentional and explicitly replaced in Tasks 3-5; no other placeholders.
- Type consistency: `moveTaskToIndex(taskId, columnId, index)` used identically in store (Task 7) and KanbanPage (Task 10). `startTimer(mode, taskId?)` consistent across store, TaskCard, FocusTimer. `endTimer(completed)` consistent across store, PlayerBar, FocusTimer. `api.updateTask(id, { columnId, order })` shape matches the server PUT partial contract in Task 3.
