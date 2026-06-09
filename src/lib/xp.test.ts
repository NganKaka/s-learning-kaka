import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client before importing the module under test.
vi.mock('./supabase', async () => {
  const { supabaseMock } = await import('../test/supabase-mock');
  return { supabase: supabaseMock };
});

import { awardXp } from './xp';
import { setMockTable, resetMockTables } from '../test/supabase-mock';

// Characterization tests for the streak/XP math in awardXp. The DB writes are
// mocked; we assert the returned { xp, streak } which encodes the streak rules.
describe('awardXp streak logic', () => {
  const now = new Date('2026-06-09T12:00:00.000Z'); // today = 2026-06-09, yesterday = 2026-06-08

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resetMockTables();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a streak at 1 when the profile does not exist', async () => {
    setMockTable('profiles', { data: null });
    const r = await awardXp({ userId: 'u', source: 'quiz_submit' });
    expect(r).toEqual({ xp: 20, streak: 1 });
  });

  it('keeps the streak unchanged and awards no bonus when already active today', async () => {
    setMockTable('profiles', {
      data: { streak_current: 3, streak_last_date: '2026-06-09', xp_total: 100 },
    });
    const r = await awardXp({ userId: 'u', source: 'quiz_submit' });
    expect(r).toEqual({ xp: 20, streak: 3 });
  });

  it('increments the streak and adds a bonus when last active yesterday', async () => {
    setMockTable('profiles', {
      data: { streak_current: 3, streak_last_date: '2026-06-08', xp_total: 100 },
    });
    const r = await awardXp({ userId: 'u', source: 'quiz_submit' });
    // newStreak = 4, bonus = 5 * 4 = 20, base quiz xp = 20 → total 40
    expect(r).toEqual({ xp: 40, streak: 4 });
  });

  it('resets the streak to 1 when the gap is more than a day', async () => {
    setMockTable('profiles', {
      data: { streak_current: 9, streak_last_date: '2026-06-01', xp_total: 500 },
    });
    const r = await awardXp({ userId: 'u', source: 'flashcard_review' });
    expect(r).toEqual({ xp: 10, streak: 1 });
  });

  it('uses the per-source base XP value', async () => {
    setMockTable('profiles', {
      data: { streak_current: 1, streak_last_date: '2026-06-09', xp_total: 0 },
    });
    const r = await awardXp({ userId: 'u', source: 'drill_complete' });
    expect(r.xp).toBe(15);
  });
});
