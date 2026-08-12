import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskCard from '../TaskCard';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    deleteTask: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
  },
}));

const task = {
  id: 1, title: '写周报', description: '本周进展总结',
  columnId: 1, priority: 'high' as const, pomodoroMinutes: 25,
  order: 0, dueDate: null, completedAt: null, createdAt: '',
};

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('TaskCard', () => {
  it('renders title, priority dot, and minutes badge', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('写周报')).toBeTruthy();
    expect(screen.getByText('⏱ 25 分钟')).toBeTruthy();
  });

  it('shows action buttons on hover', () => {
    render(
      <MemoryRouter>
        <TaskCard task={task} onEdit={() => {}} />
      </MemoryRouter>
    );
    fireEvent.mouseEnter(screen.getByText('写周报'));
    expect(screen.getByLabelText('编辑')).toBeTruthy();
    expect(screen.getByLabelText('专注')).toBeTruthy();
    expect(screen.getByLabelText('删除')).toBeTruthy();
  });
});
