/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Dedicated Vitest config — intentionally minimal (no tailwind/image-optimizer
// plugins) so unit tests run fast. Playwright e2e stays in playwright.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Dummy Supabase env so `src/lib/supabase.ts` can be imported transitively
    // by pure-logic modules under test without throwing. No network calls are
    // made — pure functions never touch the client.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/database.types.ts', 'src/lib/supabase.ts'],
      // Per-file ratchets on the modules with a regression safety net. No global
      // floor — many lib modules are untested (and some are dead code removed in
      // Phase 3), which would skew an aggregate threshold.
      thresholds: {
        'src/lib/date.ts': { lines: 95, statements: 95, functions: 95 },
        'src/lib/srs.ts': { lines: 45, statements: 45 },
        'src/lib/quiz.ts': { lines: 60, statements: 60 },
        'src/lib/xp.ts': { lines: 75, statements: 75 },
        'src/lib/certificate.ts': { lines: 70, statements: 70 },
      },
    },
  },
});
