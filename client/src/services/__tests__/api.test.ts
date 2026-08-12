import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();

  localStorage.setItem('astra-user', JSON.stringify({
    id: 1,
    email: 'test@test.com',
    phone: '',
    nickname: 'Test User',
    avatarUrl: '',
    school: '',
    vipType: 0,
  }));

  const mockStore: {
    lists: any[];
    items: any[];
  } = {
    lists: [],
    items: [],
  };

  vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof _input === 'string' ? _input : _input.toString();

    if (init?.method === 'PATCH' && url.includes('/todos/items')) {
      const body = JSON.parse(init.body as string);
      const idx = mockStore.items.findIndex((item) => item.uuid === body.uuid);
      if (idx >= 0) {
        mockStore.items[idx] = { ...mockStore.items[idx], ...body };
      } else {
        mockStore.items.push(body);
      }
      return {
        ok: true,
        json: async () => body,
      };
    }

    if (init?.method === 'PATCH' && url.includes('/todos/lists')) {
      const body = JSON.parse(init.body as string);
      const idx = mockStore.lists.findIndex((l) => l.uuid === body.uuid);
      if (idx >= 0) {
        mockStore.lists[idx] = { ...mockStore.lists[idx], ...body };
      } else {
        mockStore.lists.push(body);
      }
      return {
        ok: true,
        json: async () => body,
      };
    }

    if (url.includes('/todos/items')) {
      const activeItems = mockStore.items.filter((t) => t.isDeleted !== 1 && t.isTrash !== 1);
      return {
        ok: true,
        json: async () => activeItems,
      };
    }

    if (url.includes('/todos/lists')) {
      const activeLists = mockStore.lists.filter((l) => l.isDeleted !== 1 && l.isTrash !== 1);
      return {
        ok: true,
        json: async () => activeLists,
      };
    }

    if (url.includes('/focus-times')) {
      return {
        ok: true,
        json: async () => [],
      };
    }

    return {
      ok: true,
      json: async () => [],
    };
  }));
});

describe('localStorage api', () => {
  it('seeds 4 default columns on first access', async () => {
    const { columns } = await api.loadAll();
    expect(columns.map((c) => c.title)).toEqual(['待办', '进行中', '待审核', '已完成']);
  });

  it('creates a task and persists it', async () => {
    const { columns } = await api.loadAll();
    const task = await api.createTask({ title: '写周报', columnId: columns[0].id, priority: 'high' });
    expect(task.id).toBeTruthy();
    expect(task.priority).toBe('high');
    const { tasks } = await api.loadAll();
    const created = tasks.find((t) => t.title === '写周报');
    expect(created).toBeTruthy();
  });

  it('endFocusSession accumulates minutes onto the task', async () => {
    const { columns } = await api.loadAll();
    const task = await api.createTask({ title: '读书', columnId: columns[0].id });
    const started = await api.startFocusSession('focus', task.id);
    await api.endFocusSession(started.id, 25, true);
    const { tasks } = await api.loadAll();
    const updated = tasks.find((t) => t.id === task.id);
    expect(updated?.pomodoroMinutes).toBe(25);
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
    const { columns } = await api.loadAll();
    const task = await api.createTask({ title: 'A', columnId: columns[0].id });
    const started = await api.startFocusSession('focus', task.id);
    await api.endFocusSession(started.id, 10, true);
    await api.deleteTask(task.id);
    const sessions = await api.getSessions();
    expect(sessions.filter((s) => s.taskId === task.id)).toHaveLength(0);
  });
});
