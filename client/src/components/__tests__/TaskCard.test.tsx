import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskCard from '../TaskCard';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    deleteTask: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
    loadAll: vi.fn(async () => ({ columns: [], tasks: [], sessions: [] })),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
  },
}));

const task = {
  id: '1', title: '写周报', description: '本周进展总结',
  columnId: '1', priority: 'high' as const, pomodoroMinutes: 25,
  order: 0, dueDate: null, completedAt: null, createdAt: '',
  scheduledTime: null as number | null, startTime: null as number | null,
  endTime: null as number | null,
};

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('TaskCard', () => {
  it('renders title, priority badge, and pomodoro minutes', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('写周报')).toBeTruthy();
    expect(screen.getByText('25 分钟')).toBeTruthy();
    expect(screen.getByText('高')).toBeTruthy();
  });

  it('shows action buttons', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('编辑')).toBeTruthy();
    expect(screen.getByText('专注')).toBeTruthy();
    expect(screen.getByText('删除')).toBeTruthy();
  });
});
