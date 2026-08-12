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
