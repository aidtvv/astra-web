import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FocusTimer from '../FocusTimer';
import { useStore, initialStore } from '../../store';

vi.mock('../../services/api', () => ({
  api: {
    startFocusSession: vi.fn(async () => ({ id: 1, startedAt: '' })),
    endFocusSession: vi.fn(async () => ({ ok: true })),
    getTasks: vi.fn(async () => []),
    getColumns: vi.fn(async () => []),
    getSessions: vi.fn(async () => []),
    getDaily: vi.fn(async () => []),
    getSummary: vi.fn(async () => ({ totalMinutes: 0, totalSessions: 0, streakDays: 0, todayMinutes: 0 })),
    updateTask: vi.fn(async () => ({})),
  },
}));

beforeEach(() => {
  useStore.setState(initialStore);
  vi.clearAllMocks();
});

describe('FocusTimer', () => {
  it('shows 25:00 for focus mode', () => {
    render(<MemoryRouter><FocusTimer /></MemoryRouter>);
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('mode pill switches duration to 5:00 for break', async () => {
    render(<MemoryRouter><FocusTimer /></MemoryRouter>);
    fireEvent.click(screen.getByText('休息'));
    expect(screen.getByText('05:00')).toBeTruthy();
  });
});
