import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', async () => {
  const { supabaseMock } = await import('../test/supabase-mock');
  return { supabase: supabaseMock };
});

import { applyRating, nextDueAt, submitReview, type ReviewState } from './srs';
import { setMockTable, resetMockTables } from '../test/supabase-mock';

// Characterization tests for the SM-2 spaced-repetition core.
// These lock CURRENT behavior — Phase 5+ refactors must keep these green.

const fresh: ReviewState = { ease: 2.5, interval_days: 0, reps: 0 };

describe('applyRating', () => {
  describe('rating 0 (Again / failed)', () => {
    it('resets interval and reps to 0 and drops ease by 0.2', () => {
      expect(applyRating({ ease: 2.5, interval_days: 6, reps: 3 }, 0)).toEqual({
        ease: 2.3,
        interval_days: 0,
        reps: 0,
      });
    });

    it('floors ease at 1.3 on repeated failures', () => {
      expect(applyRating({ ease: 1.4, interval_days: 10, reps: 5 }, 0).ease).toBe(1.3);
      expect(applyRating({ ease: 1.3, interval_days: 10, reps: 5 }, 0).ease).toBe(1.3);
    });
  });

  describe('interval progression on correct reviews', () => {
    it('first correct review → interval 1 day, reps 1', () => {
      const r = applyRating(fresh, 2);
      expect(r.interval_days).toBe(1);
      expect(r.reps).toBe(1);
    });

    it('second correct review → interval 6 days, reps 2', () => {
      const r = applyRating({ ease: 2.5, interval_days: 1, reps: 1 }, 2);
      expect(r.interval_days).toBe(6);
      expect(r.reps).toBe(2);
    });

    it('third+ correct review → round(interval * ease)', () => {
      const r = applyRating({ ease: 2.5, interval_days: 6, reps: 2 }, 2);
      expect(r.interval_days).toBe(15); // round(6 * 2.5)
      expect(r.reps).toBe(3);
    });

    it('rounds non-integer interval products', () => {
      // round(10 * 2.36) = round(23.6) = 24
      expect(applyRating({ ease: 2.36, interval_days: 10, reps: 4 }, 2).interval_days).toBe(24);
    });
  });

  describe('ease adjustment by rating', () => {
    it('Hard (1) lowers ease by 0.15, floored at 1.3', () => {
      expect(applyRating({ ease: 2.5, interval_days: 1, reps: 1 }, 1).ease).toBeCloseTo(2.35, 5);
      expect(applyRating({ ease: 1.35, interval_days: 1, reps: 1 }, 1).ease).toBe(1.3);
    });

    it('Good (2) leaves ease unchanged', () => {
      expect(applyRating({ ease: 2.5, interval_days: 1, reps: 1 }, 2).ease).toBe(2.5);
    });

    it('Easy (3) raises ease by 0.15', () => {
      expect(applyRating({ ease: 2.5, interval_days: 1, reps: 1 }, 3).ease).toBeCloseTo(2.65, 5);
    });
  });

  it('does not mutate the input state', () => {
    const prev = { ...fresh };
    applyRating(prev, 2);
    expect(prev).toEqual(fresh);
  });
});

describe('nextDueAt', () => {
  const base = new Date('2026-01-01T00:00:00.000Z');

  it('schedules a failed card (interval 0) 10 minutes out', () => {
    expect(nextDueAt(0, base)).toBe('2026-01-01T00:10:00.000Z');
  });

  it('adds N days for a positive interval', () => {
    expect(nextDueAt(6, base)).toBe('2026-01-07T00:00:00.000Z');
  });

  it('does not mutate the provided from-date', () => {
    const from = new Date(base);
    nextDueAt(6, from);
    expect(from.getTime()).toBe(base.getTime());
  });
});

describe('submitReview', () => {
  beforeEach(() => resetMockTables());

  it('starts from the default state (ease 2.5) for a never-reviewed card', async () => {
    setMockTable('card_reviews', { data: null, error: null });
    const { error, state } = await submitReview({ userId: 'u', cardId: 'c', rating: 2 });
    expect(error).toBeNull();
    // default {2.5, 0, 0} + Good → first interval 1 day, reps 1, ease unchanged
    expect(state).toEqual({ ease: 2.5, interval_days: 1, reps: 1 });
  });

  it('advances from existing review state', async () => {
    setMockTable('card_reviews', { data: { ease: 2.5, interval_days: 6, reps: 2 }, error: null });
    const { state } = await submitReview({ userId: 'u', cardId: 'c', rating: 2 });
    expect(state).toEqual({ ease: 2.5, interval_days: 15, reps: 3 });
  });

  it('propagates an upsert error and returns a null state', async () => {
    setMockTable('card_reviews', { data: null, error: { message: 'rls denied' } });
    const { error, state } = await submitReview({ userId: 'u', cardId: 'c', rating: 0 });
    expect(error).toBe('rls denied');
    expect(state).toBeNull();
  });
});
