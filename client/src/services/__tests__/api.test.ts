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
