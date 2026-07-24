/**
 * config.test.ts - Tests for the BYPASS_AUTH flag (single source of truth).
 *
 * Why this matters: BYPASS_AUTH must default to FALSE so production builds use
 * the real backend. Any change that flips the default is a critical security
 * regression and these tests will catch it.
 *
 * Approach: config.ts reads import.meta.env['VITE_BYPASS_AUTH'] at module load,
 * so each test stubs the env var and re-imports the module fresh to evaluate
 * the flag against the stubbed value.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('BYPASS_AUTH flag', () => {
  beforeEach(() => {
    // Reset modules so each test re-evaluates config.ts against the stubbed env.
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to false when VITE_BYPASS_AUTH is unset', async () => {
    vi.stubEnv('VITE_BYPASS_AUTH', '');
    const { BYPASS_AUTH } = await import('../config');
    expect(BYPASS_AUTH).toBe(false);
  });

  it('is true only when VITE_BYPASS_AUTH is exactly "true"', async () => {
    vi.stubEnv('VITE_BYPASS_AUTH', 'true');
    const { BYPASS_AUTH } = await import('../config');
    expect(BYPASS_AUTH).toBe(true);
  });

  it.each([
    ['false', false],
    ['TRUE', false], // case-sensitive on purpose — only lowercase 'true' counts
    ['1', false],
    ['yes', false],
    ['on', false],
    [' anything ', false],
  ])('is false for VITE_BYPASS_AUTH=%j', async (raw, expected) => {
    vi.stubEnv('VITE_BYPASS_AUTH', raw);
    const { BYPASS_AUTH } = await import('../config');
    expect(BYPASS_AUTH).toBe(expected);
  });
});
