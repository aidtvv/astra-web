import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsPage from '../StatsPage';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    updateTask: vi.fn(async () => ({})),
  },
}));

beforeEach(() => {
  useStore.setState({
    ...initialStore,
    summary: { totalMinutes: 175, totalSessions: 7, streakDays: 3, todayMinutes: 50 },
    daily: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      minutes: i % 5 === 0 ? 50 : 0,
    })),
  });
  vi.clearAllMocks();
});

describe('StatsPage', () => {
  it('renders 4 KPI cards with formatted values', () => {
    render(<StatsPage />);
    expect(screen.getByText('总专注时长')).toBeTruthy();
    expect(screen.getByText('2h 55m')).toBeTruthy(); // 175 min
    expect(screen.getByText('总会话数')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('连续打卡')).toBeTruthy();
    expect(screen.getByText('3 天')).toBeTruthy();
    expect(screen.getByText('今日专注')).toBeTruthy();
    expect(screen.getByText('50 分钟')).toBeTruthy();
  });

  it('renders a heatmap with 30 cells', () => {
    render(<StatsPage />);
    const cells = document.querySelectorAll('[data-testid="heat-cell"]');
    expect(cells.length).toBe(30);
  });
});
