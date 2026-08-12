import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// NOTE: At this task the pages/Sidebar/PlayerBar are stubs and App does not
// touch the store yet, so no mocking is needed. Sidebar labels are asserted
// once Sidebar is implemented.

describe('App shell', () => {
  it('renders a main content region', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeTruthy();
  });
});
