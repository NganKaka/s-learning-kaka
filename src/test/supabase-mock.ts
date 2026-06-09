import { vi } from 'vitest';

/**
 * Reusable Supabase client mock for unit-testing lib modules that touch the DB.
 *
 * Usage in a test file:
 *   vi.mock('./supabase', async () => {
 *     const { supabaseMock } = await import('../test/supabase-mock');
 *     return { supabase: supabaseMock };
 *   });
 *   // then per-test: setMockTable('profiles', { data: {...} });
 *
 * The chainable builder mirrors the subset of the supabase-js query API used
 * across the codebase. Terminal `single`/`maybeSingle` and awaiting the builder
 * directly both resolve to the result registered for that table.
 */

export type MockResult = { data?: unknown; error?: unknown };

const mockTables: Record<string, MockResult> = {};

export function setMockTable(table: string, result: MockResult): void {
  mockTables[table] = result;
}

export function resetMockTables(): void {
  for (const key of Object.keys(mockTables)) delete mockTables[key];
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'in',
  'gt',
  'gte',
  'lt',
  'lte',
  'not',
  'is',
  'order',
  'limit',
  'range',
  'contains',
];

function createBuilder(result: MockResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Make the builder awaitable for queries that resolve without single().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

export const supabaseMock = {
  from: vi.fn((table: string) => createBuilder(mockTables[table] ?? { data: null, error: null })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
      remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
};
