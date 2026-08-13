import { computeHash } from './hash';
import {
  getColumns,
  getFocusRecords,
  getSessions,
  getTasks,
  getMeta,
  setMeta,
  bulkReplaceColumns,
  bulkReplaceTasks,
  bulkReplaceSessions,
  upsertFocusRecords,
  deleteFocusRecordsOlderThan,
  initializeDefaultColumns,
  type ColumnRecord,
  type TaskRecord,
  type SessionRecord,
} from './db';
import { api } from '../services/api';
import type { Column, Task, PomodoroSession, FocusTimeRecord } from '../types';

const HASH_KEYS = {
  KANBAN: 'hash:kanban',
  FOCUS_RECORDS: 'hash:focus-records',
  LAST_SYNC: 'meta:last-sync',
  PRUNE_THRESHOLD: 'meta:prune-threshold',
};

const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export interface SyncResult<T> {
  data: T;
  changed: boolean;
  hashMatched: boolean;
  fromCache: boolean;
  lastSync: number;
}

export interface KanbanData {
  columns: ColumnRecord[];
  tasks: TaskRecord[];
  sessions: SessionRecord[];
}

export interface FocusRecordsData {
  records: FocusTimeRecord[];
}

async function loadKanbanFromCache(): Promise<KanbanData | null> {
  try {
    const [columns, tasks, sessions] = await Promise.all([
      getColumns(),
      getTasks(),
      getSessions(),
    ]);
    if (columns.length === 0 && tasks.length === 0 && sessions.length === 0) {
      return null;
    }
    return { columns, tasks, sessions };
  } catch {
    return null;
  }
}

async function loadFocusRecordsFromCache(): Promise<FocusTimeRecord[] | null> {
  try {
    const records = await getFocusRecords();
    if (records.length === 0) {
      return null;
    }
    return records;
  } catch {
    return null;
  }
}

async function fetchKanbanFromAPI(): Promise<{
  columns: Column[];
  tasks: Task[];
  sessions: PomodoroSession[];
}> {
  return api.loadAll();
}

async function fetchFocusRecordsFromAPI(): Promise<FocusTimeRecord[]> {
  return api.fetchFocusRecords();
}

function mergeWithLocalSessions(
  serverTasks: Task[],
  _serverSessions: PomodoroSession[],
  localSessions: SessionRecord[]
): TaskRecord[] {
  const pomodoroMap = new Map<string, number>();
  for (const s of localSessions) {
    if (s.completed && s.taskId) {
      pomodoroMap.set(s.taskId, (pomodoroMap.get(s.taskId) ?? 0) + s.duration);
    }
  }

  const now = Date.now();
  return serverTasks.map((task) => ({
    ...task,
    pomodoroMinutes: pomodoroMap.get(task.id) ?? 0,
    updatedAt: now,
  }));
}

export async function syncKanban(): Promise<SyncResult<KanbanData>> {
  const cached = await loadKanbanFromCache();

  const { columns: cachedColumns, tasks: cachedTasks, sessions: cachedSessions } =
    cached ?? { columns: [] as ColumnRecord[], tasks: [] as TaskRecord[], sessions: [] as SessionRecord[] };

  const cachedPayload = {
    columns: cachedColumns.map(({ updatedAt: _u, ...rest }) => rest),
    tasks: cachedTasks.map(({ updatedAt: _u, ...rest }) => rest),
    sessions: cachedSessions.map(({ updatedAt: _u, ...rest }) => rest),
  };

  const cachedHash = await computeHash(cachedPayload);
  const storedHash = await getMeta(HASH_KEYS.KANBAN);

  console.log('[syncKanban] cache state:', {
    hasCache: !!cached,
    columns: cachedColumns.length,
    tasks: cachedTasks.length,
    sessions: cachedSessions.length,
    hashMatch: storedHash === cachedHash,
    storedHash: storedHash ? storedHash.slice(0, 8) + '...' : 'null',
    cachedHash: cachedHash.slice(0, 8) + '...',
  });

  if (cached && cachedColumns.length > 0 && (storedHash === cachedHash)) {
    const lastSync = Number(await getMeta(HASH_KEYS.LAST_SYNC) || '0');
    console.log('[syncKanban] Hash matched, returning cached data');
    return {
      data: cached,
      changed: false,
      hashMatched: true,
      fromCache: true,
      lastSync,
    };
  }

  console.log('[syncKanban] Fetching from API...');
  try {
    const { columns: serverColumns, tasks: serverTasks } = await fetchKanbanFromAPI();
    console.log('[syncKanban] API returned:', {
      columnsCount: serverColumns.length,
      tasksCount: serverTasks.length,
    });

    const now = Date.now();
    const serverColumnRecords: ColumnRecord[] = serverColumns.map((c) => ({
      ...c,
      updatedAt: now,
    }));

    const mergedTasks = mergeWithLocalSessions(serverTasks, [], cachedSessions);

    const serverPayload = {
      columns: serverColumns,
      tasks: serverTasks,
    };
    const serverHash = await computeHash(serverPayload);

    if (serverHash === storedHash) {
      const lastSync = Date.now();
      await setMeta(HASH_KEYS.LAST_SYNC, String(lastSync));
      await setMeta(HASH_KEYS.KANBAN, serverHash);
      const finalColumns = await getColumns();
      const finalTasks = await getTasks();
      const finalSessions = await getSessions();
      return {
        data: { columns: finalColumns, tasks: finalTasks, sessions: finalSessions },
        changed: finalColumns.length > 0 || finalTasks.length > 0,
        hashMatched: true,
        fromCache: false,
        lastSync,
      };
    }

    let changed = false;

    const localColumnIds = new Set(cachedColumns.map((c) => c.id));
    const serverColumnIds = new Set(serverColumnRecords.map((c) => c.id));

    if (serverColumnIds.size !== localColumnIds.size ||
        [...serverColumnIds].some((id) => !localColumnIds.has(id))) {
      await bulkReplaceColumns(serverColumnRecords);
      changed = true;
    } else {
      for (const sc of serverColumnRecords) {
        const lc = cachedColumns.find((c) => c.id === sc.id);
        if (lc && (lc.title !== sc.title || lc.order !== sc.order)) {
          changed = true;
          break;
        }
      }
      if (changed) await bulkReplaceColumns(serverColumnRecords);
    }

    const localTaskIds = new Set(cachedTasks.map((t) => t.id));
    const serverTaskIds = new Set(mergedTasks.map((t) => t.id));

    if (serverTaskIds.size !== localTaskIds.size ||
        [...serverTaskIds].some((id) => !localTaskIds.has(id))) {
      await bulkReplaceTasks(mergedTasks);
      changed = true;
    } else {
      for (const st of mergedTasks) {
        const lt = cachedTasks.find((t) => t.id === st.id);
        if (lt && (lt.title !== st.title || lt.order !== st.order || lt.columnId !== st.columnId)) {
          changed = true;
          break;
        }
      }
      if (changed) await bulkReplaceTasks(mergedTasks);
    }

    if (cachedSessions.length > 0) {
      const sessionRecords: SessionRecord[] = cachedSessions.map((s) => ({
        ...s,
        updatedAt: now,
      }));
      await bulkReplaceSessions(sessionRecords);
    }

    const lastSync = Date.now();
    await setMeta(HASH_KEYS.LAST_SYNC, String(lastSync));
    await setMeta(HASH_KEYS.KANBAN, serverHash);

    const finalColumns = await getColumns();
    const finalTasks = await getTasks();
    const finalSessions = await getSessions();

    return {
      data: { columns: finalColumns, tasks: finalTasks, sessions: finalSessions },
      changed,
      hashMatched: false,
      fromCache: false,
      lastSync,
    };
  } catch (e) {
    console.warn('[syncKanban] API fetch failed, returning cached data:', e instanceof Error ? e.message : String(e));
    return {
      data: cached ?? { columns: [], tasks: [], sessions: [] },
      changed: false,
      hashMatched: false,
      fromCache: !!cached,
      lastSync: Number(await getMeta(HASH_KEYS.LAST_SYNC) || '0'),
    };
  }
}

export async function syncFocusRecords(): Promise<SyncResult<FocusRecordsData>> {
  const cached = await loadFocusRecordsFromCache();

  const cachedPayload = (cached ?? []).map(({ uuid: _u, ...rest }) => rest);
  const cachedHash = await computeHash(cachedPayload);
  const storedHash = await getMeta(HASH_KEYS.FOCUS_RECORDS);

  console.log('[syncFocusRecords] cache state:', {
    hasCache: !!cached,
    recordCount: cached?.length ?? 0,
    hashMatch: storedHash === cachedHash,
  });

  if (cached && cached.length > 0 && storedHash === cachedHash) {
    const lastSync = Number(await getMeta(HASH_KEYS.LAST_SYNC) || '0');
    console.log('[syncFocusRecords] Hash matched, returning cached data');
    const finalRecords = await getFocusRecords();
    return {
      data: { records: finalRecords },
      changed: finalRecords.length > 0,
      hashMatched: true,
      fromCache: false,
      lastSync,
    };
  }

  console.log('[syncFocusRecords] Fetching from API...');
  try {
    const serverRecords = await fetchFocusRecordsFromAPI();

    const serverPayload = serverRecords.map(({ uuid: _u, ...rest }) => rest);
    const serverHash = await computeHash(serverPayload);

    if (serverHash === storedHash) {
      const lastSync = Date.now();
      await setMeta(HASH_KEYS.LAST_SYNC, String(lastSync));
      const finalRecords = await getFocusRecords();
      return {
        data: { records: finalRecords },
        changed: finalRecords.length > 0,
        hashMatched: true,
        fromCache: false,
        lastSync,
      };
    }

    const cutoffTime = Date.now() - TTL_30_DAYS;
    const prunedRecords = serverRecords.filter((r) => r.startTime >= cutoffTime);

    await upsertFocusRecords(prunedRecords);

    const deletedCount = await deleteFocusRecordsOlderThan(cutoffTime);
    if (deletedCount > 0) {
      console.info(`[syncFocusRecords] Pruned ${deletedCount} records older than 30 days`);
    }

    const lastSync = Date.now();
    await setMeta(HASH_KEYS.LAST_SYNC, String(lastSync));
    await setMeta(HASH_KEYS.FOCUS_RECORDS, serverHash);

    const finalRecords = await getFocusRecords();

    return {
      data: { records: finalRecords },
      changed: true,
      hashMatched: false,
      fromCache: false,
      lastSync,
    };
  } catch (e) {
    console.warn('[syncFocusRecords] API fetch failed, returning cached data');
    return {
      data: { records: cached ?? [] },
      changed: false,
      hashMatched: false,
      fromCache: !!cached,
      lastSync: Number(await getMeta(HASH_KEYS.LAST_SYNC) || '0'),
    };
  }
}

export async function ensureInitialized(): Promise<void> {
  await initializeDefaultColumns();
}

export async function getLastSyncTime(): Promise<number> {
  return Number(await getMeta(HASH_KEYS.LAST_SYNC) || '0');
}

export async function performPruning(): Promise<number> {
  const cutoffTime = Date.now() - TTL_30_DAYS;
  return deleteFocusRecordsOlderThan(cutoffTime);
}
