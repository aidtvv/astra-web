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

type StoreState = typeof initialStore;

interface Store extends StoreState {
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

function resetTimerFields(initial: typeof initialStore): Partial<Store> {
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
