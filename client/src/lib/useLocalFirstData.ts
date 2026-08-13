import { useState, useEffect, useCallback, useRef } from 'react';
import {
  syncKanban,
  syncFocusRecords,
  getLastSyncTime,
  ensureInitialized,
} from './syncService';
import { useStore } from '../store';
import {
  getColumns,
  getTasks,
  getSessions,
  getFocusRecords,
  type ColumnRecord,
  type TaskRecord,
  type SessionRecord,
} from './db';
import { api } from '../services/api';
import type { StatsViewRange, FocusTimeRecord } from '../types';

interface KanbanState {
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  sessions: SessionRecord[];
  loading: boolean;
  synced: boolean;
  lastSync: number;
}

const STALE_THRESHOLD = 5 * 60 * 1000;

function loadLegacyKanbanData(): { columns: ColumnRecord[]; tasks: TaskRecord[]; sessions: SessionRecord[] } | null {
  try {
    const raw = localStorage.getItem('astra-db');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;

    const now = Date.now();
    const columns: ColumnRecord[] = (parsed.columns || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      order: c.order ?? 0,
      emoji: c.emoji,
      accentColor: c.accentColor,
      updatedAt: now,
    }));
    const tasks: TaskRecord[] = (parsed.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      columnId: t.columnId,
      priority: t.priority || 'low',
      pomodoroMinutes: t.pomodoroMinutes || 0,
      order: t.order ?? 0,
      dueDate: t.dueDate || null,
      completedAt: t.completedAt || null,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: now,
      scheduledTime: t.scheduledTime || null,
      startTime: t.startTime || null,
      endTime: t.endTime || null,
    }));
    const sessions: SessionRecord[] = (parsed.sessions || []).map((s: any) => ({
      id: s.id,
      taskId: s.taskId || null,
      duration: s.duration || 0,
      completed: s.completed || false,
      startedAt: s.startedAt || new Date().toISOString(),
      finishedAt: s.finishedAt || null,
      mode: s.mode || 'focus',
      updatedAt: now,
    }));

    if (columns.length === 0 && tasks.length === 0) return null;
    return { columns, tasks, sessions };
  } catch {
    return null;
  }
}

export function useLocalKanbanData(forceRefresh = false): KanbanState {
  const [columns, setColumns] = useState<ColumnRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const isMountedRef = useRef(true);
  const syncingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const syncInBackground = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const result = await syncKanban();
      if (isMountedRef.current && result.changed) {
        setColumns(result.data.columns);
        setTasks(result.data.tasks);
        setSessions(result.data.sessions);
      }
      if (isMountedRef.current) {
        setSynced(true);
        setLastSync(result.lastSync);
      }
    } catch (e) {
      console.warn('[useLocalKanbanData] syncInBackground failed:', e instanceof Error ? e.message : String(e));
      if (isMountedRef.current) {
        setSynced(true);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    hasLoadedRef.current = false;

    const loadWithTimeout = async (timeoutMs: number) => {
      let cols: ColumnRecord[] = [];
      let tks: TaskRecord[] = [];
      let sess: SessionRecord[] = [];
      let timedOut = false;

      try {
        const initPromise = ensureInitialized();
        const initTimeout = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('init_timeout')), timeoutMs)
        );
        await Promise.race([initPromise, initTimeout]);

        const dataPromise = Promise.all([getColumns(), getTasks(), getSessions()]);
        const dataTimeout = new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('data_timeout')), timeoutMs)
        );
        [cols, tks, sess] = await Promise.race([dataPromise, dataTimeout]);
      } catch (e) {
        timedOut = true;
        console.warn('[useLocalKanbanData] loadFromCache failed:', e instanceof Error ? e.message : String(e));
      }

      if (!isMountedRef.current) return;

      const cacheEmpty = cols.length === 0 && tks.length === 0;
      const tasksEmpty = tks.length === 0;

      if (cacheEmpty || timedOut) {
        const legacy = loadLegacyKanbanData();
        if (legacy && (legacy.columns.length > 0 || legacy.tasks.length > 0)) {
          cols = legacy.columns;
          tks = legacy.tasks;
          sess = legacy.sessions;
        }
      }

      setColumns(cols);
      setTasks(tks);
      setSessions(sess);
      setLoading(false);
      hasLoadedRef.current = true;

      if (!isMountedRef.current) return;

      if (cacheEmpty || timedOut || forceRefresh || tasksEmpty) {
        console.log('[useLocalKanbanData] Need sync:', { cacheEmpty, timedOut, forceRefresh, tasksEmpty });
        syncInBackground();
      } else {
        try {
          const t = await getLastSyncTime();
          if (!isMountedRef.current) return;
          setLastSync(t);
          if (Date.now() - t > STALE_THRESHOLD) {
            syncInBackground();
          } else {
            setSynced(true);
          }
        } catch {
          if (isMountedRef.current) {
            setSynced(true);
          }
        }
      }
    };

    loadWithTimeout(3000);

    return () => {
      isMountedRef.current = false;
    };
  }, [forceRefresh, syncInBackground]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      useStore.setState({
        columns: columns.map(({ updatedAt: _u, ...rest }) => rest),
        tasks: tasks.map(({ updatedAt: _u, ...rest }) => rest),
        sessions: sessions.map(({ updatedAt: _u, ...rest }) => rest),
        loading: false,
      });
    }
  }, [columns, tasks, sessions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureInitialized();
      const [cols, tks, sess] = await Promise.all([
        getColumns(),
        getTasks(),
        getSessions(),
      ]);
      if (isMountedRef.current) {
        setColumns(cols);
        setTasks(tks);
        setSessions(sess);
      }
    } catch (e) {
      console.warn('[useLocalKanbanData] refresh load failed:', e instanceof Error ? e.message : String(e));
    }
    await syncInBackground();
  }, [syncInBackground]);

  useEffect(() => {
    (window as any).__kanbanRefresh = refresh;
    return () => {
      delete (window as any).__kanbanRefresh;
    };
  }, [refresh]);

  return { columns, tasks, sessions, loading, synced, lastSync };
}

export function useLocalFocusData(forceRefresh = false): {
  records: FocusTimeRecord[];
  loading: boolean;
  synced: boolean;
  lastSync: number;
  refresh: () => void;
} {
  const [records, setRecords] = useState<FocusTimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const isMountedRef = useRef(true);
  const syncingRef = useRef(false);

  const syncInBackground = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const result = await syncFocusRecords();
      if (isMountedRef.current) {
        if (result.changed || result.data.records.length > 0) {
          setRecords(result.data.records);
        }
        setSynced(true);
        setLastSync(result.lastSync);
      }
    } catch (e) {
      console.warn('[useLocalFocusData] syncInBackground failed:', e instanceof Error ? e.message : String(e));
      if (isMountedRef.current) {
        setSynced(true);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const loadWithTimeout = async (timeoutMs: number) => {
      let recs: FocusTimeRecord[] = [];
      let timedOut = false;

      try {
        const dataPromise = getFocusRecords();
        const dataTimeout = new Promise<FocusTimeRecord[]>((_, reject) =>
          setTimeout(() => reject(new Error('data_timeout')), timeoutMs)
        );
        recs = await Promise.race([dataPromise, dataTimeout]);
      } catch (e) {
        timedOut = true;
        console.warn('[useLocalFocusData] loadFromCache failed:', e instanceof Error ? e.message : String(e));
      }

      if (isMountedRef.current) {
        setRecords(recs);
        setLoading(false);
      }

      if (!isMountedRef.current) return;

      const recordsEmpty = recs.length === 0;
      if (recordsEmpty || timedOut || forceRefresh) {
        console.log('[useLocalFocusData] Need sync:', { recordsEmpty, timedOut, forceRefresh });
        syncInBackground();
      } else {
        try {
          const t = await getLastSyncTime();
          if (!isMountedRef.current) return;
          setLastSync(t);
          if (Date.now() - t > STALE_THRESHOLD) {
            syncInBackground();
          } else {
            setSynced(true);
          }
        } catch {
          if (isMountedRef.current) {
            setSynced(true);
          }
        }
      }
    };

    loadWithTimeout(3000);

    return () => {
      isMountedRef.current = false;
    };
  }, [forceRefresh, syncInBackground]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await getFocusRecords();
      if (isMountedRef.current) {
        setRecords(recs);
        setLoading(false);
      }
    } catch {}
    await syncInBackground();
  }, [syncInBackground]);

  return { records, loading, synced, lastSync, refresh };
}

export function useLocalFocusStatsData(viewRange: StatsViewRange, forceRefresh = false) {
  const { records, loading, synced, lastSync, refresh } = useLocalFocusData(forceRefresh);
  const focusStats = useStore((s) => s.focusStats);
  const setFocusStats = useStore((s) => s.setFocusStats);
  const setFocusTimeRecords = useStore((s) => s.setFocusTimeRecords);
  const currentRange = useStore((s) => s.statsViewRange);

  useEffect(() => {
    if (records.length === 0) return;
    const stats = api.computeStatsFromRecords(records, viewRange);
    setFocusStats(stats);
    setFocusTimeRecords(records);
  }, [records, viewRange, setFocusStats, setFocusTimeRecords]);

  useEffect(() => {
    if (currentRange !== viewRange) {
      useStore.setState({ statsViewRange: viewRange });
    }
  }, [viewRange, currentRange]);

  return { records, focusStats, loading, synced, lastSync, refresh };
}