import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './lib/ThemeProvider';
import { useStore } from './store';

describe('App shell', () => {
  beforeEach(() => {
    localStorage.setItem('astra-token', 'mock-token');
    localStorage.setItem(
      'astra-user',
      JSON.stringify({
        id: 1,
        email: 'test@example.com',
        phone: '1234567890',
        nickname: 'TestUser',
        avatarUrl: '',
        school: 'Test',
        vipType: 0,
      })
    );
    useStore.getState().initializeAuth();
  });

  it('renders a main content region', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeTruthy();
  });
});