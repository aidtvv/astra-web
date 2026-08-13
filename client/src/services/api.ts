import type { Column, Task, PomodoroSession, DailyStat, Summary, TodoListDTO, TodoItemDTO, PriorityLevel, FocusTimeRecord, FocusStats, StatsViewRange } from '../types';
import { getToken, getStoredUser } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const DB_KEY = 'astra-db';

export interface LocalDB {
  columns: Column[];
  tasks: Task[];
  sessions: PomodoroSession[];
  seq: number;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'default-1', title: '待办', order: 0, emoji: '待办', accentColor: '#fa2d48' },
  { id: 'default-2', title: '进行中', order: 1, emoji: '进行中', accentColor: '#ff9500' },
  { id: 'default-3', title: '待审核', order: 2, emoji: '待审核', accentColor: '#5856d6' },
  { id: 'default-4', title: '已完成', order: 3, emoji: '已完成', accentColor: '#34c759' },
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

function mapPriorityToLevel(p: number): PriorityLevel {
  if (p === 3) return 'highest';
  if (p === 1) return 'high';
  if (p === 2) return 'medium';
  return 'low';
}

function mapLevelToPriority(level: PriorityLevel): number {
  switch (level) {
    case 'highest': return 3;
    case 'high': return 1;
    case 'medium': return 2;
    default: return 0;
  }
}

function generateUuid(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

async function fetchJson<T>(path: string, options?: RequestInit, retries = 3): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
    Platform: 'web',
  };
  if (token) {
    headers['X-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json() as Promise<T>;
    } catch (e: any) {
      lastError = e;
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`fetchJson retry ${attempt + 1}/${retries} for ${path}: ${e?.message}, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error(`Failed after ${retries + 1} attempts: ${path}`);
}

async function patchList(dto: Partial<TodoListDTO> & { uuid?: string; name?: string }): Promise<TodoListDTO> {
  const user = getStoredUser();
  const now = Date.now();
  const payload = {
    uuid: dto.uuid ?? generateUuid(),
    name: dto.name ?? '',
    decoration: dto.decoration ?? '',
    isDeleted: dto.isDeleted ?? 0,
    isTrash: dto.isTrash ?? 0,
    userId: user?.id ?? 0,
    createTime: dto.createTime ?? now,
    updateTime: now,
    reorder: dto.reorder ?? 0,
    isSync: 0,
    type: dto.type ?? 0,
    todoItemList: [],
    newTodoItemName: '',
  };
  return fetchJson<TodoListDTO>('/api/v3/todos/lists', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function patchItem(dto: Partial<TodoItemDTO> & { uuid: string }): Promise<TodoItemDTO> {
  const user = getStoredUser();
  const payload = {
    userId: user?.id ?? 0,
    imageUrl: dto.imageUrl ?? '',
    name: dto.name ?? '',
    comment: dto.comment ?? '',
    state: dto.state ?? 0,
    isDeleted: dto.isDeleted ?? 0,
    isTrash: dto.isTrash ?? 0,
    todoListUuid: dto.todoListUuid ?? '',
    uuid: dto.uuid,
    createTime: dto.createTime ?? Date.now(),
    updateTime: Date.now(),
    checkedTime: dto.checkedTime ?? 0,
    scheduledTime: dto.scheduledTime ?? 0,
    seriesUuid: dto.seriesUuid ?? '',
    occurrenceIndex: dto.occurrenceIndex ?? 0,
    occurrenceTime: dto.occurrenceTime ?? 0,
    startTime: dto.startTime ?? 0,
    endTime: dto.endTime ?? 0,
    priority: dto.priority ?? 0,
    type: dto.type ?? 0,
    reorder: dto.reorder ?? 0,
    count: dto.count ?? 0,
  };
  return fetchJson<TodoItemDTO>('/api/v3/todos/items', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function fetchLists(): Promise<TodoListDTO[]> {
  const user = getStoredUser();
  if (!user) return [];
  try {
    const data = await fetchJson<TodoListDTO[]>(`/api/v3/todos/lists?userId=${user.id}`);
    return (data || []).filter((l) => l.isDeleted === 0 && l.isTrash === 0);
  } catch (e) {
    console.error('Failed to fetch lists', e);
    return [];
  }
}

async function fetchItems(): Promise<TodoItemDTO[]> {
  const user = getStoredUser();
  if (!user) return [];

  const pageSize = 200;
  const allItems: TodoItemDTO[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const batch = await fetchJson<TodoItemDTO[]>(
        `/api/v3/todos/items?userId=${user.id}&page=${page}&size=${pageSize}&sort=updateTime,desc`
      );
      const rawCount = (batch || []).length;
      allItems.push(...(batch || []));

      if (rawCount < pageSize) {
        hasMore = false;
      } else {
        page++;
      }

      if (page > 100) {
        console.warn('fetchItems: reached page limit, stopping');
        hasMore = false;
      }
    } catch (e) {
      console.error(`Failed to fetch items page ${page}`, e);
      hasMore = false;
    }
  }

  return allItems.filter((t) => t.isDeleted === 0 && t.isTrash === 0);
}

function mapListToColumn(dto: TodoListDTO): Column {
  const emoji = dto.decoration || '';
  const typeColors: Record<number, string> = {
    0: '#fa2d48', 1: '#ff9500', 2: '#5856d6', 3: '#34c759', 4: '#007aff',
  };
  return {
    id: dto.uuid,
    title: dto.name,
    order: dto.reorder ?? 0,
    emoji,
    accentColor: typeColors[dto.type] ?? '#fa2d48',
  };
}

function mapItemToTask(dto: TodoItemDTO): Task {
  const completedAt = dto.state === 1 && dto.checkedTime > 0
    ? new Date(dto.checkedTime).toISOString()
    : null;
  const dueDate = dto.scheduledTime > 0
    ? new Date(dto.scheduledTime).toISOString().slice(0, 10)
    : null;
  const createdAt = dto.createTime > 0
    ? new Date(dto.createTime).toISOString()
    : new Date(dto.updateTime || Date.now()).toISOString();

  const rawName = (dto.name ?? '').trim();
  const title = rawName.length > 0 ? rawName : '未命名任务';

  return {
    id: dto.uuid,
    title,
    description: dto.comment || '',
    columnId: dto.todoListUuid,
    priority: mapPriorityToLevel(dto.priority),
    pomodoroMinutes: 0,
    order: dto.reorder ?? 0,
    dueDate,
    completedAt,
    createdAt,
    scheduledTime: dto.scheduledTime > 0 ? dto.scheduledTime : null,
    startTime: dto.startTime > 0 ? dto.startTime : null,
    endTime: dto.endTime > 0 ? dto.endTime : null,
  };
}

function mapTaskToDTO(task: Partial<Task> & { id: string }): Partial<TodoItemDTO> {
  return {
    uuid: task.id,
    name: task.title ?? '',
    comment: task.description ?? '',
    todoListUuid: task.columnId ?? '',
    priority: mapLevelToPriority((task.priority as PriorityLevel) ?? 'low'),
    reorder: task.order ?? 0,
    state: task.completedAt ? 1 : 0,
    isDeleted: 0,
    isTrash: 0,
    scheduledTime: task.scheduledTime ?? 0,
    startTime: task.startTime ?? 0,
    endTime: task.endTime ?? 0,
  };
}

interface FocusTimeRecordDTO {
  uuid: string;
  dayNum: number;
  endTime: number;
  name: string;
  comment: string;
  pauseEndTime: number;
  pauseStartTime: number;
  pauseTotalTime: number;
  startTime: number;
  state: number;
  type: number;
  timeZone: number;
  userId: number;
  createTime: number;
  updateTime: number;
  isDeleted: number;
  scheduledTime: number;
}

function mapFocusTimeRecord(dto: FocusTimeRecordDTO): FocusTimeRecord {
  return {
    uuid: dto.uuid,
    dayNum: dto.dayNum,
    endTime: dto.endTime || 0,
    name: dto.name || '',
    comment: dto.comment || '',
    pauseEndTime: dto.pauseEndTime || 0,
    pauseStartTime: dto.pauseStartTime || 0,
    pauseTotalTime: dto.pauseTotalTime || 0,
    startTime: dto.startTime || 0,
    state: dto.state,
    type: dto.type,
    timeZone: dto.timeZone,
    userId: dto.userId,
    createTime: dto.createTime,
    updateTime: dto.updateTime,
    isDeleted: dto.isDeleted || 0,
    scheduledTime: dto.scheduledTime || 0,
  };
}

async function fetchAllFocusTimes(): Promise<FocusTimeRecord[]> {
  const user = getStoredUser();
  if (!user) {
    console.log('[API] fetchAllFocusTimes: no user stored, returning empty');
    return [];
  }

  const pageSize = 200;
  const concurrency = 4;

  const firstPage = await fetchJson<FocusTimeRecordDTO[]>(
    `/api/v3/focus-times/pageable?userId=${user.id}&page=0&size=${pageSize}`
  );

  console.log('[API] fetchAllFocusTimes firstPage:', { length: (firstPage || []).length });

  const allRecords: FocusTimeRecord[] = (firstPage || [])
    .filter((r) => r.isDeleted === 0)
    .map(mapFocusTimeRecord);

  if ((firstPage || []).length < pageSize) {
    const sorted = allRecords.sort((a, b) => b.startTime - a.startTime);
    console.log('[API] fetchAllFocusTimes complete (single page):', sorted.length, 'records');
    if (sorted.length > 0) {
      console.log('[API] first record:', {
        name: sorted[0].name,
        startTime: new Date(sorted[0].startTime).toISOString(),
        endTime: sorted[0].endTime,
        duration: sorted[0].endTime - sorted[0].startTime,
      });
    }
    return sorted;
  }

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batchPages: number[] = [];
    for (let i = 0; i < concurrency && hasMore; i++) {
      batchPages.push(page + i);
    }
    page += batchPages.length;

    const results = await Promise.allSettled(
      batchPages.map((p) =>
        fetchJson<FocusTimeRecordDTO[]>(
          `/api/v3/focus-times/pageable?userId=${user.id}&page=${p}&size=${pageSize}`
        )
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const batch = result.value;
        const rawCount = batch.length;
        const records = batch
          .filter((r) => r.isDeleted === 0)
          .map(mapFocusTimeRecord);
        allRecords.push(...records);

        if (rawCount < pageSize) {
          hasMore = false;
        }
      } else {
        if (result.status === 'rejected') {
          console.error(`fetchAllFocusTimes page ${batchPages[i]} failed:`, (result as PromiseRejectedResult).reason);
        }
      }
    }

    if (page > 500) {
      console.warn('fetchAllFocusTimes: reached page limit (500), stopping');
      break;
    }
  }

  const seen = new Set<string>();
  const deduplicated = allRecords
    .filter((r) => {
      if (seen.has(r.uuid)) return false;
      seen.add(r.uuid);
      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);
  console.log('[API] fetchAllFocusTimes complete (paginated):', deduplicated.length, 'records');
  return deduplicated;
}

function getDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRangeForView(view: StatsViewRange): { start: number; end: number } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (view) {
    case 'day': {
      const start = todayStart;
      const end = start + 24 * 60 * 60 * 1000;
      return { start, end };
    }
    case 'week': {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = todayStart - mondayOffset * 24 * 60 * 60 * 1000;
      const end = start + 7 * 24 * 60 * 60 * 1000;
      return { start, end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
      return { start, end };
    }
    case 'all':
    default:
      return { start: 0, end: Number.MAX_SAFE_INTEGER };
  }
}

function computeFocusStats(records: FocusTimeRecord[], view: StatsViewRange): FocusStats {
  const { start, end } = getRangeForView(view);
  const filtered = records.filter((r) => r.startTime >= start && r.startTime < end);

  let totalMinutes = 0;
  const dailyMinutes: Record<string, number> = {};
  const taskBreakdown: Record<string, { name: string; minutes: number; sessions: number }> = {};
  let longestSession: FocusStats['longestSession'] = null;
  const positiveDays = new Set<string>();
  const completedSessions = filtered.filter((r) => r.state === 1 || (r.endTime && r.endTime > 0));

  for (const r of filtered) {
    const durationMs = r.endTime - r.startTime - (r.pauseTotalTime || 0);
    const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

    if (durationMinutes <= 0) continue;

    totalMinutes += durationMinutes;

    const dateKey = getDateKey(r.startTime);
    dailyMinutes[dateKey] = (dailyMinutes[dateKey] || 0) + durationMinutes;
    positiveDays.add(dateKey);

    const taskName = r.name || '未命名任务';
    if (!taskBreakdown[taskName]) {
      taskBreakdown[taskName] = { name: taskName, minutes: 0, sessions: 0 };
    }
    taskBreakdown[taskName].minutes += durationMinutes;
    taskBreakdown[taskName].sessions++;

    if (!longestSession || durationMinutes * 60000 > longestSession.duration) {
      longestSession = {
        duration: durationMinutes * 60000,
        name: taskName,
        date: dateKey,
      };
    }
  }

  let streakDays = 0;
  const cursor = new Date();
  const todayKey = getDateKey(cursor.getTime());
  if (!positiveDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (positiveDays.has(getDateKey(cursor.getTime()))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const daysInRange = view === 'day' ? 1 :
    view === 'week' ? 7 :
    view === 'month' ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() :
    view === 'year' ? 365 :
    Math.max(1, Math.ceil((Date.now() - (records[records.length - 1]?.startTime || Date.now())) / (24 * 60 * 60 * 1000)));

  const avgDailyMinutes = daysInRange > 0 ? Math.round(totalMinutes / daysInRange) : 0;

  return {
    totalMinutes,
    totalSessions: filtered.length,
    completedSessions: completedSessions.length,
    streakDays,
    dailyMinutes,
    taskBreakdown,
    longestSession,
    avgDailyMinutes,
  };
}

export const api = {
  loadAll: async (): Promise<{ columns: Column[]; tasks: Task[]; sessions: PomodoroSession[] }> => {
    const db = loadDB();
    const [dtoLists, dtoItems, sessions] = await Promise.all([
      fetchLists(),
      fetchItems(),
      api.getSessions(),
    ]);

    let columns: Column[];
    let serverTasks: Task[];

    if (dtoLists.length > 0) {
      columns = dtoLists.map(mapListToColumn).sort((a, b) => a.order - b.order);
      serverTasks = dtoItems.map(mapItemToTask);
    } else if (dtoItems.length > 0) {
      const uniqueListUuids = [...new Set(dtoItems.map((t) => t.todoListUuid))];
      columns = uniqueListUuids.map((uuid, idx) => ({
        id: uuid,
        title: `清单 ${idx + 1}`,
        order: idx,
        emoji: '',
        accentColor: '#5856d6',
      }));
      serverTasks = dtoItems.map(mapItemToTask);
    } else {
      const localColumns = [...db.columns].sort((a, b) => a.order - b.order);
      const localTasks = db.tasks
        .filter((t) => localColumns.some((c) => c.id === t.columnId))
        .sort((a, b) => a.order - b.order);
      if (localTasks.length > 0 || localColumns.length > 0) {
        return { columns: localColumns, tasks: localTasks, sessions };
      }
      return { columns: DEFAULT_COLUMNS, tasks: [], sessions };
    }

    const existingColumnIds = new Set(columns.map((c) => c.id));
    const missingListUuids = [...new Set(serverTasks.map((t) => t.columnId))].filter((id) => !existingColumnIds.has(id));
    if (missingListUuids.length > 0) {
      const startOrder = columns.length;
      const extraColumns: Column[] = missingListUuids.map((uuid, idx) => ({
        id: uuid,
        title: `清单 ${columns.length + idx + 1}`,
        order: startOrder + idx,
        emoji: '',
        accentColor: '#5856d6',
      }));
      columns = [...columns, ...extraColumns];
    }

    const localSessions = db.sessions;
    const pomodoroMap = new Map<string, number>();
    for (const s of localSessions) {
      if (s.completed && s.taskId) {
        pomodoroMap.set(s.taskId, (pomodoroMap.get(s.taskId) ?? 0) + s.duration);
      }
    }

    const tasks = serverTasks.map((task) => ({
      ...task,
      pomodoroMinutes: pomodoroMap.get(task.id) ?? 0,
    }));

    tasks.sort((a, b) => a.order - b.order);

    const mergedDB: LocalDB = {
      columns,
      tasks,
      sessions: localSessions,
      seq: db.seq,
    };
    saveDB(mergedDB);

    return { columns, tasks, sessions };
  },

  createColumn: async (data: { title: string; emoji?: string; accentColor?: string }): Promise<Column> => {
    const user = getStoredUser();
    const now = Date.now();
    const uuid = generateUuid();
    const dto: Partial<TodoListDTO> = {
      uuid,
      name: data.title,
      decoration: data.emoji ?? '',
      isDeleted: 0,
      isTrash: 0,
      userId: user?.id ?? 0,
      createTime: now,
      updateTime: now,
      reorder: 0,
      type: 0,
    };

    try {
      const result = await patchList(dto as TodoListDTO & { uuid: string });
      return mapListToColumn(result);
    } catch (e) {
      console.error('Failed to create column via API, falling back to local', e);
      const db = loadDB();
      const column: Column = {
        id: uuid,
        title: data.title,
        order: db.columns.length,
        emoji: data.emoji ?? '',
        accentColor: data.accentColor ?? '#fa2d48',
      };
      db.columns.push(column);
      saveDB(db);
      return column;
    }
  },

  updateColumn: async (id: string, data: Partial<Column>): Promise<Column> => {
    try {
      const user = getStoredUser();
      const now = Date.now();
      const dto: Partial<TodoListDTO> = {
        uuid: id,
        name: data.title ?? '',
        decoration: data.emoji ?? '',
        isDeleted: 0,
        isTrash: 0,
        userId: user?.id ?? 0,
        updateTime: now,
        type: 0,
      };
      const result = await patchList(dto as TodoListDTO & { uuid: string });
      return mapListToColumn(result);
    } catch (e) {
      console.error('Failed to update column via API, falling back to local', e);
      const db = loadDB();
      const column = db.columns.find((c) => c.id === id);
      if (!column) throw new Error('Column not found');
      Object.assign(column, data);
      saveDB(db);
      return { ...column };
    }
  },

  deleteColumn: async (id: string): Promise<{ ok: boolean }> => {
    try {
      await patchList({ uuid: id, isTrash: 1 } as TodoListDTO & { uuid: string });
      return { ok: true };
    } catch (e) {
      console.error('Failed to delete column via API, falling back to local', e);
      const db = loadDB();
      db.columns = db.columns.filter((c) => c.id !== id);
      db.tasks = db.tasks.filter((t) => t.columnId !== id);
      saveDB(db);
      return { ok: true };
    }
  },

  createTask: async (data: Partial<Task>): Promise<Task> => {
    const user = getStoredUser();
    const columnId = data.columnId ?? '';
    if (!columnId) throw new Error('columnId is required');

    const uuid = generateUuid();
    const now = Date.now();
    const priority = mapLevelToPriority((data.priority as PriorityLevel) ?? 'low');

    const dto: Partial<TodoItemDTO> = {
      uuid,
      todoListUuid: columnId,
      name: data.title ?? '',
      comment: data.description ?? '',
      state: 0,
      isDeleted: 0,
      isTrash: 0,
      userId: user?.id ?? 0,
      createTime: now,
      updateTime: now,
      checkedTime: 0,
      scheduledTime: data.scheduledTime ?? 0,
      seriesUuid: '',
      occurrenceIndex: 0,
      occurrenceTime: 0,
      startTime: data.startTime ?? 0,
      endTime: data.endTime ?? 0,
      priority,
      type: 0,
      reorder: data.order ?? 0,
      imageUrl: '',
      count: 0,
    };

    try {
      const result = await patchItem(dto as TodoItemDTO & { uuid: string });
      return mapItemToTask(result);
    } catch (e) {
      console.error('Failed to create task via API, falling back to local', e);
      const db = loadDB();
      const maxOrder = db.tasks.filter((t) => t.columnId === columnId).reduce((m, t) => Math.max(m, t.order), -1);
      const task: Task = {
        id: uuid,
        title: data.title ?? '',
        description: data.description ?? '',
        columnId,
        priority: (data.priority as PriorityLevel) ?? 'medium',
        pomodoroMinutes: 0,
        order: maxOrder + 1,
        dueDate: data.scheduledTime ? new Date(data.scheduledTime).toISOString().slice(0, 10) : null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        scheduledTime: data.scheduledTime ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
      };
      db.tasks.push(task);
      saveDB(db);
      return task;
    }
  },

  updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
    // Merge with existing task data so that partial updates (e.g. moving
    // a task by only { order, columnId }) do not wipe out other fields
    // like title, description, priority, scheduledTime, etc.
    const db = loadDB();
    const existing = db.tasks.find((t) => t.id === id);
    const merged: Partial<Task> & { id: string } = existing
      ? { ...existing, ...data, id }
      : { ...data, id };
    const dto = mapTaskToDTO(merged);
    try {
      const result = await patchItem(dto as TodoItemDTO & { uuid: string });
      const updated = mapItemToTask(result);
      // Update local DB cache so subsequent reads pick up server-normalized fields
      const db2 = loadDB();
      const idx = db2.tasks.findIndex((t) => t.id === id);
      if (idx >= 0) {
        db2.tasks[idx] = { ...db2.tasks[idx], ...updated };
        saveDB(db2);
      }
      return updated;
    } catch (e) {
      console.error('Failed to update task via API, falling back to local', e);
      if (existing) {
        Object.assign(existing, data);
        saveDB(db);
        return { ...existing };
      }
      throw new Error('Task not found');
    }
  },

  deleteTask: async (id: string): Promise<{ ok: boolean }> => {
    const dto: Partial<TodoItemDTO> = { uuid: id, isDeleted: 1 };
    const db = loadDB();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    db.sessions = db.sessions.filter((s) => s.taskId !== id);
    saveDB(db);
    try {
      await patchItem(dto as TodoItemDTO & { uuid: string });
      return { ok: true };
    } catch (e) {
      console.error('Failed to delete task via API, local state already updated', e);
      return { ok: true };
    }
  },

  startFocusSession: async (mode: string, taskId?: string | null): Promise<{ id: number; startedAt: string }> => {
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
    return { id: session.id, startedAt: session.startedAt };
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
    return { ok: true };
  },

  getSessions: async (): Promise<PomodoroSession[]> => {
    const db = loadDB();
    return [...db.sessions].sort((a, b) => {
      const ta = a.startedAt || '';
      const tb = b.startedAt || '';
      return tb.localeCompare(ta);
    });
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
    return result;
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
    return { totalMinutes, totalSessions: completed.length, streakDays: streak, todayMinutes };
  },

  fetchFocusRecords: async (): Promise<FocusTimeRecord[]> => {
    return fetchAllFocusTimes();
  },

  getFocusStats: async (view: StatsViewRange, records?: FocusTimeRecord[]): Promise<FocusStats> => {
    const data = records ?? await fetchAllFocusTimes();
    return computeFocusStats(data, view);
  },

  computeStatsFromRecords: (records: FocusTimeRecord[], view: StatsViewRange): FocusStats => {
    return computeFocusStats(records, view);
  },
};
