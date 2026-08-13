import { create } from 'zustand';
import { api } from '../services/api';
import { login as apiLogin, logout as apiLogout, getStoredUser, isAuthenticated as checkAuth, type AuthenticatedUser } from '../services/auth';
import type { Column, Task, PomodoroSession, DailyStat, Summary, FocusTimeRecord, FocusStats, StatsViewRange } from '../types';

export type FocusMode = 'focus' | 'break' | 'free';
export type TimerStatus = 'idle' | 'running' | 'paused';

export const MODE_MINUTES: Record<FocusMode, number> = { focus: 25, break: 5, free: 25 };

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type PendingOpType =
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'MOVE_TASK'
  | 'CREATE_COLUMN'
  | 'UPDATE_COLUMN'
  | 'DELETE_COLUMN';

export interface PendingOp {
  id: string;
  type: PendingOpType;
  payload: any;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  createdAt: number;
}

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
  taskId: null as string | null,
  sessionId: null as number | null,
  sessionUuid: null as string | null,
  modalDefaultColumn: null as string | null,
  user: null as AuthenticatedUser | null,
  isAuthenticated: false,
  syncStatus: 'idle' as SyncStatus,
  lastSyncTime: null as number | null,
  lastSyncError: null as string | null,
  pendingOps: [] as PendingOp[],
  isProcessing: false,
  focusTimeRecords: [] as FocusTimeRecord[],
  focusStats: {
    totalMinutes: 0,
    totalSessions: 0,
    completedSessions: 0,
    streakDays: 0,
    dailyMinutes: {},
    taskBreakdown: {},
    longestSession: null,
    avgDailyMinutes: 0,
  } as FocusStats,
  statsViewRange: 'week' as StatsViewRange,
  focusStatsLoading: false,
  _statsRequestId: 0,
};

type StoreState = typeof initialStore;

interface Store extends StoreState {
  loadAll(): Promise<void>;
  loadStats(): Promise<void>;
  loadFocusStats(viewRange?: StatsViewRange): Promise<void>;
  setStatsViewRange(view: StatsViewRange): void;
  setFocusStats(stats: FocusStats): void;
  setFocusTimeRecords(records: FocusTimeRecord[]): void;
  refreshAfterFocus(): Promise<void>;
  triggerSync(): Promise<void>;

  addPendingOp(type: PendingOpType, payload: any): void;
  processQueue(): Promise<void>;
  retryOp(opId: string): Promise<void>;

  createTask(data: Partial<Task>): Promise<void>;
  updateTask(id: string, data: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  moveTaskToIndex(taskId: string, columnId: string, index: number): Promise<void>;
  addColumn(title: string): Promise<void>;
  updateColumn(id: string, data: Partial<Column>): Promise<void>;
  deleteColumn(id: string): Promise<void>;

  setMode(mode: FocusMode): void;
  startTimer(mode: FocusMode, taskId?: string | null): Promise<void>;
  pauseTimer(): void;
  resumeTimer(): void;
  tick(): void;
  endTimer(completed: boolean): Promise<void>;

  login(identifier: string, password: string): Promise<void>;
  logout(): void;
  initializeAuth(): void;
}

function resetTimerFields(initial: typeof initialStore): Partial<Store> {
  return { status: 'idle', sessionId: null, sessionUuid: null, taskId: null, remainingSeconds: initial.totalSeconds };
}

function genOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useStore = create<Store>((set, get) => ({
  ...initialStore,

  loadAll: async () => {
    set({ loading: true });
    try {
      const { columns: serverColumns, tasks: serverTasks, sessions } = await api.loadAll();
      const existing = get();

      // Preserve tasks/columns that are only in local state (e.g. temp-id tasks
      // created optimistically but not yet uploaded).
      const localOnlyTasks = existing.tasks.filter(
        (lt) => !serverTasks.some((st) => st.id === lt.id)
      );
      const localOnlyColumns = existing.columns.filter(
        (lc) => !serverColumns.some((sc) => sc.id === lc.id)
      );

      const mergedColumns = [...serverColumns, ...localOnlyColumns];
      const mergedTasks = [...serverTasks, ...localOnlyTasks];

      // Apply optimistic pending updates on top of server data so that edits
      // made while offline/in-flight are not overwritten by a fresh pull.
      const finalColumns = applyPendingUpdates(mergedColumns, existing.pendingOps, 'column');
      const finalTasks = applyPendingUpdates(mergedTasks, existing.pendingOps, 'task');

      set({
        columns: finalColumns,
        tasks: finalTasks,
        sessions,
        loading: false,
        lastSyncTime: Date.now(),
        lastSyncError: null,
      });
    } catch (e: any) {
      console.error('loadAll failed', e);
      set({ loading: false, lastSyncError: e?.message ?? '加载失败' });
    }
  },

  triggerSync: async () => {
    const { pendingOps, isProcessing } = get();
    if (pendingOps.length > 0 || isProcessing) {
      get().processQueue();
      return;
    }
    set({ syncStatus: 'syncing' });

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const [{ columns, tasks, sessions }, records] = await Promise.all([
          api.loadAll(),
          api.fetchFocusRecords(),
        ]);
        const { statsViewRange } = get();
        const focusStats = api.computeStatsFromRecords(records, statsViewRange);
        set({
          columns,
          tasks,
          sessions,
          focusTimeRecords: records,
          focusStats,
          syncStatus: 'synced',
          lastSyncTime: Date.now(),
          lastSyncError: null,
        });
        return;
      } catch (e: any) {
        lastError = e;
        if (attempt < maxRetries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`triggerSync retry ${attempt + 1}/${maxRetries}: ${e?.message}, retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    set({ syncStatus: 'error', lastSyncError: lastError?.message ?? '同步失败' });
  },

  loadStats: async () => {
    try {
      const [daily, summary] = await Promise.all([api.getDaily(30), api.getSummary()]);
      set({ daily, summary });
    } catch (e) {
      console.error('loadStats failed', e);
    }
  },

  loadFocusStats: async (viewRange) => {
    const state = get();
    const range = viewRange ?? state.statsViewRange;
    const requestId = state._statsRequestId + 1;
    console.log('[Store] loadFocusStats start:', { viewRange, range, requestId, currentRecords: state.focusTimeRecords.length });
    set({ focusStatsLoading: true, _statsRequestId: requestId });
    try {
      const records = await api.fetchFocusRecords();
      console.log('[Store] loadFocusStats fetched:', { count: records.length, requestId, currentRequestId: get()._statsRequestId });
      if (requestId !== get()._statsRequestId) {
        console.log('[Store] loadFocusStats stale request, dropping result');
        return;
      }
      const currentRange = get().statsViewRange;
      const effectiveRange = viewRange ? range : currentRange;
      const stats = api.computeStatsFromRecords(records, effectiveRange);
      console.log('[Store] loadFocusStats computed stats:', { totalMinutes: stats.totalMinutes, completed: stats.completedSessions, dailyMinutesKeys: Object.keys(stats.dailyMinutes).length });
      set({
        focusTimeRecords: records,
        focusStats: stats,
        focusStatsLoading: false,
      });
    } catch (e) {
      if (requestId !== get()._statsRequestId) return;
      console.error('[Store] loadFocusStats failed', e);
      set({ focusStatsLoading: false });
    }
  },

  setStatsViewRange: (view) => {
    const { focusTimeRecords } = get();
    const stats = api.computeStatsFromRecords(focusTimeRecords, view);
    set({ statsViewRange: view, focusStats: stats });
  },

  setFocusStats: (stats) => {
    set({ focusStats: stats });
  },

  setFocusTimeRecords: (records) => {
    set({ focusTimeRecords: records });
  },

  refreshAfterFocus: async () => {
    try {
      const [{ tasks, sessions }, records] = await Promise.all([
        api.loadAll(),
        api.fetchFocusRecords(),
      ]);
      const [daily, summary] = await Promise.all([api.getDaily(30), api.getSummary()]);
      const { statsViewRange } = get();
      const focusStats = api.computeStatsFromRecords(records, statsViewRange);
      set({ tasks, sessions, daily, summary, focusTimeRecords: records, focusStats, lastSyncTime: Date.now(), lastSyncError: null });
    } catch (e) {
      console.error('refreshAfterFocus failed', e);
    }
  },

  // ─── Async Queue ───────────────────────────────────────

  addPendingOp: (type: PendingOpType, payload: any) => {
    const op: PendingOp = {
      id: genOpId(),
      type,
      payload,
      status: 'pending',
      createdAt: Date.now(),
    };
    set((s) => ({
      pendingOps: [...s.pendingOps, op],
      syncStatus: 'syncing',
    }));
    get().processQueue();
  },

  processQueue: async () => {
    const state = get();
    if (state.isProcessing) return;
    if (state.pendingOps.length === 0) {
      if (state.syncStatus === 'syncing') set({ syncStatus: 'synced', lastSyncTime: Date.now() });
      return;
    }

    set({ isProcessing: true });

    const processNext = async () => {
      const current = get();
      if (current.pendingOps.length === 0) {
        set({ isProcessing: false, syncStatus: 'synced', lastSyncTime: Date.now(), lastSyncError: null });
        get().loadAll().catch(() => {});
        return;
      }

      const op = current.pendingOps.find((o) => o.status === 'pending' || o.status === 'error');
      if (!op) {
        set({ isProcessing: false });
        return;
      }

      set((s) => ({
        pendingOps: s.pendingOps.map((o) => (o.id === op.id ? { ...o, status: 'uploading' as const } : o)),
      }));

      const maxRetries = 3;
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= maxRetries) {
        try {
          await executeOp(op);
          set((s) => ({
            pendingOps: s.pendingOps.filter((o) => o.id !== op.id),
          }));
          set({ isProcessing: false });
          processNext();
          return;
        } catch (e: any) {
          lastError = e;
          attempt++;
          if (attempt <= maxRetries) {
            const delay = 500 * attempt;
            console.warn(`Op ${op.id} retry ${attempt}/${maxRetries}: ${e?.message}, retrying in ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      set((s) => ({
        pendingOps: s.pendingOps.map((o) => (o.id === op.id ? { ...o, status: 'error' as const, error: lastError?.message ?? '上传失败' } : o)),
        syncStatus: 'error',
        lastSyncError: lastError?.message ?? '同步失败',
      }));
      set({ isProcessing: false });
      return;
    };

    processNext();
  },

  retryOp: async (opId: string) => {
    const state = get();
    const op = state.pendingOps.find((o) => o.id === opId);
    if (!op) return;
    set((s) => ({
      pendingOps: s.pendingOps.map((o) => (o.id === opId ? { ...o, status: 'pending' as const, error: undefined } : o)),
      syncStatus: 'syncing',
    }));
    get().processQueue();
  },

  // ─── Task CRUD (Optimistic) ────────────────────────────

  createTask: async (data) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const task: Task = {
      id: tempId,
      title: data.title ?? '',
      description: data.description ?? '',
      columnId: data.columnId ?? '',
      priority: data.priority ?? 'medium',
      pomodoroMinutes: 0,
      order: data.order ?? 0,
      dueDate: data.scheduledTime ? new Date(data.scheduledTime).toISOString().slice(0, 10) : null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      scheduledTime: data.scheduledTime ?? null,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
    get().addPendingOp('CREATE_TASK', { tempId, data });
  },

  updateTask: async (id, data) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    get().addPendingOp('UPDATE_TASK', { id, data });
  },

  deleteTask: async (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    get().addPendingOp('DELETE_TASK', { id });
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
    const movedTask = target.find((t) => t.id === taskId)!;
    set({ tasks: [...others.filter((t) => t.columnId !== columnId), ...target] });
    get().addPendingOp('MOVE_TASK', {
      taskId,
      columnId,
      // Carry full task snapshot for the moved task so that the upload
      // never strips properties (title, priority, dates, etc.) even if
      // the task is a temp-id that hasn't been written to local DB yet.
      movedTaskSnapshot: { ...movedTask },
      targetOrders: target.map((t) => ({ id: t.id, order: t.order, columnId })),
    });
  },

  addColumn: async (title) => {
    const tempId = `temp-col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const column: Column = {
      id: tempId,
      title,
      order: get().columns.length,
      emoji: '',
      accentColor: '#fa2d48',
    };
    set((s) => ({ columns: [...s.columns, column] }));
    get().addPendingOp('CREATE_COLUMN', { tempId, title });
  },

  updateColumn: async (id, data) => {
    set((s) => ({
      columns: s.columns.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    get().addPendingOp('UPDATE_COLUMN', { id, data });
  },

  deleteColumn: async (id) => {
    set((s) => ({ columns: s.columns.filter((c) => c.id !== id) }));
    get().addPendingOp('DELETE_COLUMN', { id });
  },

  // ─── Timer ─────────────────────────────────────────────

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
      sessionUuid: res.uuid,
      totalSeconds: MODE_MINUTES[mode] * 60,
      remainingSeconds: MODE_MINUTES[mode] * 60,
    });
  },

  pauseTimer: () => {
    const { status, sessionUuid } = get();
    if (status === 'running' && sessionUuid) {
      api.pauseFocusSession(sessionUuid).catch((e) => console.warn('pause API failed:', e));
    }
    set((s) => (s.status === 'running' ? { status: 'paused' } : {}));
  },

  resumeTimer: () => {
    const { status, sessionUuid } = get();
    if (status === 'paused' && sessionUuid) {
      api.resumeFocusSession(sessionUuid).catch((e) => console.warn('resume API failed:', e));
    }
    set((s) => (s.status === 'paused' ? { status: 'running' } : {}));
  },

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

  // ─── Auth ──────────────────────────────────────────────

  login: async (identifier, password) => {
    const response = await apiLogin(identifier, password);
    set({
      user: {
        id: response.user.id,
        email: response.user.email,
        phone: response.user.phone,
        nickname: response.user.nickname,
        avatarUrl: response.user.avatarUrl,
        school: response.user.school,
        vipType: response.user.vipType,
      },
      isAuthenticated: true,
    });
  },

  logout: () => {
    apiLogout();
    set({ user: null, isAuthenticated: false });
  },

  initializeAuth: () => {
    if (checkAuth()) {
      const user = getStoredUser();
      if (user) {
        set({ user, isAuthenticated: true });
      } else {
        apiLogout();
        set({ user: null, isAuthenticated: false });
      }
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

async function executeOp(op: PendingOp): Promise<void> {
  switch (op.type) {
    case 'CREATE_TASK': {
      const { tempId, data } = op.payload;
      const task = await api.createTask(data);
      useStore.setState((s) => ({
        tasks: s.tasks.map((t) => (t.id === tempId ? { ...task, id: task.id } : t)),
      }));
      break;
    }
    case 'UPDATE_TASK': {
      const { id, data } = op.payload;
      const updated = await api.updateTask(id, data);
      useStore.setState((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
      break;
    }
    case 'DELETE_TASK': {
      const { id } = op.payload;
      await api.deleteTask(id);
      break;
    }
    case 'MOVE_TASK': {
      const { targetOrders, movedTaskSnapshot } = op.payload as {
        targetOrders: Array<{ id: string; order: number; columnId: string }>;
        movedTaskSnapshot?: Task;
      };
      await Promise.all(
        targetOrders.map((t) => {
          // If this is the task being moved and we have a full snapshot,
          // pass it so updateTask can merge without losing properties
          // (title, description, priority, dates, etc.).
          const isMoved = movedTaskSnapshot && movedTaskSnapshot.id === t.id;
          return api.updateTask(
            t.id,
            isMoved ? { ...movedTaskSnapshot!, order: t.order, columnId: t.columnId }
                    : { order: t.order, columnId: t.columnId }
          );
        })
      );
      break;
    }
    case 'CREATE_COLUMN': {
      const { tempId, title } = op.payload;
      const column = await api.createColumn({ title });
      useStore.setState((s) => ({
        columns: s.columns.map((c) => (c.id === tempId ? column : c)),
      }));
      break;
    }
    case 'UPDATE_COLUMN': {
      const { id, data } = op.payload;
      const updated = await api.updateColumn(id, data);
      useStore.setState((s) => ({
        columns: s.columns.map((c) => (c.id === id ? updated : c)),
      }));
      break;
    }
    case 'DELETE_COLUMN': {
      const { id } = op.payload;
      await api.deleteColumn(id);
      break;
    }
  }
}

function applyPendingUpdates<T extends { id: string }>(
  items: T[],
  pendingOps: PendingOp[],
  kind: 'task' | 'column',
): T[] {
  const working = [...items];

  if (kind === 'task') {
    for (const op of pendingOps) {
      if (op.status === 'done') continue;
      if (op.type === 'UPDATE_TASK') {
        const { id, data } = op.payload as { id: string; data: Partial<Task> };
        const idx = working.findIndex((w) => w.id === id);
        if (idx >= 0) {
          working[idx] = { ...working[idx], ...(data as Partial<T>) };
        }
      } else if (op.type === 'MOVE_TASK') {
        const { targetOrders } = op.payload as { targetOrders: Array<{ id: string; order: number; columnId: string }> };
        for (const { id, order, columnId } of targetOrders) {
          const idx = working.findIndex((w) => w.id === id);
          if (idx >= 0) {
            (working[idx] as any).order = order;
            (working[idx] as any).columnId = columnId;
          }
        }
      } else if (op.type === 'DELETE_TASK') {
        const { id } = op.payload as { id: string };
        const idx = working.findIndex((w) => w.id === id);
        if (idx >= 0) working.splice(idx, 1);
      }
    }
  } else {
    for (const op of pendingOps) {
      if (op.status === 'done') continue;
      if (op.type === 'UPDATE_COLUMN') {
        const { id, data } = op.payload as { id: string; data: Partial<Column> };
        const idx = working.findIndex((w) => w.id === id);
        if (idx >= 0) {
          working[idx] = { ...working[idx], ...(data as Partial<T>) };
        }
      } else if (op.type === 'DELETE_COLUMN') {
        const { id } = op.payload as { id: string };
        const idx = working.findIndex((w) => w.id === id);
        if (idx >= 0) working.splice(idx, 1);
      }
    }
  }

  return working;
}
