import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Lesson } from '../lib/database.types';

// Mock the supabase client with the shared chainable mock (per-table results).
vi.mock('../lib/supabase', async () => {
  const { supabaseMock } = await import('../test/supabase-mock');
  return { supabase: supabaseMock };
});
// Signed-in user by default; individual tests don't need to vary this.
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

import { canPlayLesson, useLessonAccess } from './useLessonAccess';
import { setMockTable, resetMockTables } from '../test/supabase-mock';

const lesson = (is_preview: boolean) =>
  ({ id: 'l1', slug: 'l', is_preview, course_id: 'c1' }) as unknown as Lesson;

beforeEach(() => resetMockTables());

describe('canPlayLesson (security decision)', () => {
  it('preview lessons are always playable', () => {
    expect(canPlayLesson(lesson(true), false)).toBe(true);
    expect(canPlayLesson(lesson(true), true)).toBe(true);
  });
  it('non-preview lessons need enrollment', () => {
    expect(canPlayLesson(lesson(false), true)).toBe(true);
    expect(canPlayLesson(lesson(false), false)).toBe(false); // locked
  });
});

describe('useLessonAccess', () => {
  function seed(opts: { preview: boolean; enrolled: boolean }) {
    setMockTable('courses', { data: { id: 'c1', slug: 'c', title: 'Course' } });
    setMockTable('lessons', { data: lesson(opts.preview) });
    setMockTable('enrollments', { data: opts.enrolled ? { id: 'e1' } : null });
  }

  it('enrolled + non-preview → canPlay, not locked', async () => {
    seed({ preview: false, enrolled: true });
    const { result } = renderHook(() => useLessonAccess('c', 'l'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canPlay).toBe(true);
    expect(result.current.locked).toBe(false);
    expect(result.current.enrolled).toBe(true);
  });

  it('preview + not enrolled → canPlay', async () => {
    seed({ preview: true, enrolled: false });
    const { result } = renderHook(() => useLessonAccess('c', 'l'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canPlay).toBe(true);
    expect(result.current.locked).toBe(false);
  });

  it('non-preview + not enrolled → locked (no bypass)', async () => {
    seed({ preview: false, enrolled: false });
    const { result } = renderHook(() => useLessonAccess('c', 'l'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canPlay).toBe(false);
    expect(result.current.locked).toBe(true);
  });

  it('missing course → notFound', async () => {
    setMockTable('courses', { data: null });
    const { result } = renderHook(() => useLessonAccess('nope', 'l'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(result.current.lesson).toBeNull();
  });
});
