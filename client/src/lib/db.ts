import Dexie, { type Table } from 'dexie';
import type { Column, Task, PomodoroSession, FocusTimeRecord } from '../types';

export interface ColumnRecord extends Column {
  updatedAt: number;
}

export interface TaskRecord extends Task {
  updatedAt: number;
}

export interface SessionRecord extends PomodoroSession {
  updatedAt: number;
}

export interface MetaRecord {
  key: string;
  value: string;
  updatedAt: number;
}

class AstraDB extends Dexie {
  columns!: Table<ColumnRecord, string>;
  tasks!: Table<TaskRecord, string>;
  sessions!: Table<SessionRecord, number>;
  focusRecords!: Table<FocusTimeRecord, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('astra-db');
    this.version(3).stores({
      columns: 'id, order',
      tasks: 'id, columnId, order',
      sessions: '++id, &taskId, startedAt',
      focusRecords: 'uuid, startTime, endTime, userId',
      meta: 'key',
    });
  }
}

let dbInstance: AstraDB | null = null;
let dbInitPromise: Promise<AstraDB> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function getDb(): Promise<AstraDB> {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available in this environment');
  }
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const instance = new AstraDB();
      await instance.open();
      dbInstance = instance;
      return instance;
    } catch {
      dbInitPromise = null;
      throw new Error('Failed to open IndexedDB database');
    }
  })();

  return dbInitPromise;
}

export function isDbAvailable(): boolean {
  return isIndexedDBAvailable();
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'default-1', title: '待办', order: 0, emoji: '待办', accentColor: '#fa2d48' },
  { id: 'default-2', title: '进行中', order: 1, emoji: '进行中', accentColor: '#ff9500' },
  { id: 'default-3', title: '待审核', order: 2, emoji: '待审核', accentColor: '#5856d6' },
  { id: 'default-4', title: '已完成', order: 3, emoji: '已完成', accentColor: '#34c759' },
];

export async function initializeDefaultColumns(): Promise<void> {
  const db = await getDb();
  const count = await db.columns.count();
  if (count === 0) {
    const now = Date.now();
    await db.columns.bulkAdd(
      DEFAULT_COLUMNS.map((c) => ({ ...c, updatedAt: now }))
    );
  }
}

export async function getColumns(): Promise<ColumnRecord[]> {
  const db = await getDb();
  return db.columns.orderBy('order').toArray();
}

export async function getTasks(): Promise<TaskRecord[]> {
  const db = await getDb();
  return db.tasks.toArray();
}

export async function getSessions(): Promise<SessionRecord[]> {
  const db = await getDb();
  return db.sessions.orderBy('startedAt').reverse().toArray();
}

export async function getFocusRecords(): Promise<FocusTimeRecord[]> {
  const db = await getDb();
  return db.focusRecords.orderBy('startTime').reverse().toArray();
}

export async function getFocusRecordsInRange(startTime: number, endTime: number): Promise<FocusTimeRecord[]> {
  const db = await getDb();
  return db.focusRecords
    .where('startTime')
    .between(startTime, endTime)
    .toArray();
}

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getDb();
  const record = await db.meta.get(key);
  return record?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.meta.put({ key, value, updatedAt: Date.now() });
}

export async function getMetaNumber(key: string): Promise<number> {
  const val = await getMeta(key);
  return val ? Number(val) : 0;
}

export async function setMetaNumber(key: string, value: number): Promise<void> {
  await setMeta(key, String(value));
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', [db.columns, db.tasks, db.sessions, db.focusRecords, db.meta], async () => {
    await db.columns.clear();
    await db.tasks.clear();
    await db.sessions.clear();
    await db.focusRecords.clear();
    await db.meta.clear();
  });
}

export async function bulkReplaceColumns(columns: ColumnRecord[]): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', db.columns, async () => {
    await db.columns.clear();
    if (columns.length > 0) {
      await db.columns.bulkAdd(columns);
    }
  });
}

export async function bulkReplaceTasks(tasks: TaskRecord[]): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.clear();
    if (tasks.length > 0) {
      await db.tasks.bulkAdd(tasks);
    }
  });
}

export async function bulkReplaceSessions(sessions: SessionRecord[]): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.clear();
    if (sessions.length > 0) {
      await db.sessions.bulkAdd(sessions);
    }
  });
}

export async function upsertFocusRecords(records: FocusTimeRecord[]): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', db.focusRecords, async () => {
    for (const record of records) {
      await db.focusRecords.put(record);
    }
  });
}

export async function replaceFocusRecords(records: FocusTimeRecord[]): Promise<void> {
  const db = await getDb();
  await db.transaction('rw', db.focusRecords, async () => {
    await db.focusRecords.clear();
    if (records.length > 0) {
      await db.focusRecords.bulkAdd(records);
    }
  });
}

export async function deleteFocusRecordsOlderThan(cutoffTime: number): Promise<number> {
  const db = await getDb();
  let deleted = 0;
  await db.transaction('rw', db.focusRecords, async () => {
    const toDelete = await db.focusRecords
      .where('startTime')
      .below(cutoffTime)
      .toArray();
    deleted = toDelete.length;
    if (toDelete.length > 0) {
      const keys = toDelete.map((r) => r.uuid);
      await db.focusRecords.bulkDelete(keys);
    }
  });
  return deleted;
}

export async function deleteTasksNotIn(keepIds: string[]): Promise<number> {
  const db = await getDb();
  const keepSet = new Set(keepIds);
  const toDelete = await db.tasks.toArray();
  const keysToDelete = toDelete.filter((t) => !keepSet.has(t.id)).map((t) => t.id);
  if (keysToDelete.length > 0) {
    await db.tasks.bulkDelete(keysToDelete);
  }
  return keysToDelete.length;
}

export async function deleteColumnsNotIn(keepIds: string[]): Promise<number> {
  const db = await getDb();
  const keepSet = new Set(keepIds);
  const toDelete = await db.columns.toArray();
  const keysToDelete = toDelete.filter((c) => !keepSet.has(c.id)).map((c) => c.id);
  if (keysToDelete.length > 0) {
    await db.columns.bulkDelete(keysToDelete);
  }
  return keysToDelete.length;
}
