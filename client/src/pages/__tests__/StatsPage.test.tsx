import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    fetchFocusRecords: vi.fn(async () => []),
    getFocusStats: vi.fn(async () => ({
      totalMinutes: 175,
      totalSessions: 7,
      completedSessions: 5,
      streakDays: 3,
      dailyMinutes: {},
      taskBreakdown: {},
      longestSession: null,
      avgDailyMinutes: 25,
    })),
    computeStatsFromRecords: vi.fn(() => ({
      totalMinutes: 175,
      totalSessions: 7,
      completedSessions: 5,
      streakDays: 3,
      dailyMinutes: {},
      taskBreakdown: {},
      longestSession: null,
      avgDailyMinutes: 25,
    })),
  },
}));

beforeEach(() => {
  useStore.setState({
    ...initialStore,
    focusStats: {
      totalMinutes: 175,
      totalSessions: 7,
      completedSessions: 5,
      streakDays: 3,
      dailyMinutes: {},
      taskBreakdown: {},
      longestSession: null,
      avgDailyMinutes: 25,
    },
    focusTimeRecords: [],
    statsViewRange: 'week',
  });
  vi.clearAllMocks();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: false,
    },
  },
});

describe('StatsPage', () => {
  it('renders KPI cards with formatted values', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StatsPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('总专注时长')).toBeTruthy();
    expect(screen.getByText('2 小时 55 分钟')).toBeTruthy();
    expect(screen.getByText('完成会话')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('连续打卡')).toBeTruthy();
    expect(screen.getByText('3 天')).toBeTruthy();
    expect(screen.getByText('日均专注')).toBeTruthy();
  });

  it('renders view range selector', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StatsPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('日')).toBeTruthy();
    expect(screen.getByText('周')).toBeTruthy();
    expect(screen.getByText('月')).toBeTruthy();
    expect(screen.getByText('年')).toBeTruthy();
    expect(screen.getByText('所有')).toBeTruthy();
  });

  it('renders bento grid sections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StatsPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('本周专注趋势')).toBeTruthy();
    expect(screen.getByText('最近专注')).toBeTruthy();
    expect(screen.getByText('专注亮点')).toBeTruthy();
    expect(screen.getByText('任务分类占比')).toBeTruthy();
  });
});
