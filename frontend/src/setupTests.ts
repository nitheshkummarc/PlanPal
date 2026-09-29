/**
 * setupTests.ts - Runs before every test file: registers the jest-dom matchers and
 * gives each test empty browser storage and fresh mocks.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
