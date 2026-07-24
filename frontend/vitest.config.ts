/**
 * vitest.config.ts - Vitest configuration
 *
 * Why: Vitest shares Vite's transform pipeline (so TS/TSX/JSX compile via the
 *      same React plugin as the dev server). jsdom provides a DOM so React
 *      Testing Library can render components.
 *
 * Env: VITE_BYPASS_AUTH is intentionally NOT defined here — tests for `config`
 *      and `AuthContext` must be able to control it. Tests that need a specific
 *      value set it via `vi.stubEnv` or by importing and re-evaluating.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/env.d.ts',
        'src/**/__tests__/**',
        'src/javascript.svg',
      ],
    },
  },
});
