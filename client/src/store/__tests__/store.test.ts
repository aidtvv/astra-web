import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, initialStore } from '../index';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '2026-08-12T00:00:00.000Z' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
    loadAll: vi.fn(async () => ({ columns: [], tasks: [], sessions: [] })),
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

function makeTask(id: string, title: string, columnId: string, order: number) {
  return {
    id, title, columnId, order, description: '', priority: 'medium' as const,
    pomodoroMinutes: 0, dueDate: null, completedAt: null, createdAt: '',
    scheduledTime: null as number | null, startTime: null as number | null,
    endTime: null as number | null,
  };
}

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
    useStore.setState({ remainingSeconds: 1 });
    useStore.getState().tick();
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
  it('reorders within a column and preserves moved task properties', async () => {
    useStore.setState({
      ...initialStore,
      tasks: [
        makeTask('1', 'A', '1', 0),
        makeTask('2', 'B', '1', 1),
      ],
    });
    await useStore.getState().moveTaskToIndex('2', '1', 0);
    const tasks = useStore.getState().tasks;
    expect(tasks.find(t => t.id === '2')!.order).toBe(0);
    expect(tasks.find(t => t.id === '1')!.order).toBe(1);
    // The moved task ('2') is uploaded with its full property snapshot
    // so that title/priority/etc. are never stripped by the server.
    const movedCall = mockApi.updateTask.mock.calls.find(
      (c: any[]) => c[0] === '2'
    );
    expect(movedCall).toBeTruthy();
    expect(movedCall![1].order).toBe(0);
    expect(movedCall![1].columnId).toBe('1');
    expect(movedCall![1].title).toBe('B');
  });

  it('moves a task across columns and updates columnId', async () => {
    useStore.setState({
      ...initialStore,
      tasks: [
        makeTask('1', 'A', '1', 0),
        makeTask('2', 'B', '2', 0),
      ],
    });
    await useStore.getState().moveTaskToIndex('1', '2', 0);
    const moved = useStore.getState().tasks.find(t => t.id === '1')!;
    expect(moved.columnId).toBe('2');
    expect(moved.order).toBe(0);
  });
});
