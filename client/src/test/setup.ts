import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest runs without `globals: true`, so RTL's auto-cleanup never registers.
// Register it explicitly so DOM from one test doesn't leak into the next.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia. Mock it so ThemeProvider and other
// components that rely on system prefers-color-scheme can render in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Suppress IndexedDB/Dexie unhandled rejections in jsdom test environment.
// jsdom has a stub indexedDB object but lacks full implementation,
// causing Dexie to throw during database open attempts.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
    if (
      msg.includes('IndexedDB API missing') ||
      msg.includes('Failed to open IndexedDB') ||
      msg.includes('DatabaseClosedError') ||
      msg.includes('Database Version error')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}
