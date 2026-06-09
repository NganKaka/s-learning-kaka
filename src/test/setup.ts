// Vitest global setup — extends expect with jest-dom matchers and clears the
// DOM between tests. Imported via vitest.config.ts `setupFiles`.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
