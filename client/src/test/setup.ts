import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest runs without `globals: true`, so RTL's auto-cleanup never registers.
// Register it explicitly so DOM from one test doesn't leak into the next.
afterEach(() => {
  cleanup();
});
