/**
 * setupTests.ts - Runs before every Vitest test file.
 *
 * Why: Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 *      and provides a clean localStorage between tests so token storage tests
 *      don't leak state into each other.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

// Hard-clear localStorage and sessionStorage between tests.
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
