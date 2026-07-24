/**
 * config.ts - Frontend runtime configuration (single source of truth)
 *
 * Why: Centralizes feature flags derived from Vite env vars so that
 *      AuthContext and axiosInstance read from one place instead of
 *      each hardcoding their own copy of a flag.
 *
 * Env vars (declared in src/env.d.ts):
 *   VITE_API_BASE_URL  - backend origin (default http://localhost:5000)
 *   VITE_BYPASS_AUTH   - 'true' enables offline UI-preview mode with a
 *                        mock API adapter and a hardcoded test user.
 *                        ANY other value (including unset) = real backend.
 *
 * Security: BYPASS_AUTH defaults to FALSE. It must be explicitly opted into
 *           via the environment; production builds must never set it.
 */

// Read once at module load. Coerce to a strict boolean so consumers can't
// accidentally compare against the raw string.
const rawBypass = import.meta.env?.VITE_BYPASS_AUTH ?? (typeof process !== 'undefined' ? process.env.VITE_BYPASS_AUTH : undefined);
export const BYPASS_AUTH: boolean = rawBypass === 'true';

/**
 * True when the app is running under the Vite/Vitest test runner.
 * Used to avoid side-effects (e.g. localStorage noise) during unit tests.
 */
export const IS_TEST_ENV: boolean =
  typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, unknown> }).env?.MODE === 'test';
