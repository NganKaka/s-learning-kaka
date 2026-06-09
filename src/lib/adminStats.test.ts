import { describe, it, expect } from 'vitest';
import { buildDailySeries } from './adminStats';

// Anchor "now" to a fixed UTC instant so day keys are deterministic.
const NOW = Date.parse('2026-06-09T08:00:00.000Z'); // today = 2026-06-09 (UTC)
const DAY = 86400000;
const iso = (offsetDays: number) => new Date(NOW - offsetDays * DAY).toISOString();

describe('buildDailySeries', () => {
  it('returns exactly `days` points ending today, zero-filled', () => {
    const s = buildDailySeries(NOW, 30, { orders: [], signups: [], enrollments: [], attempts: [] });
    expect(s).toHaveLength(30);
    expect(s[29].key).toBe('2026-06-09'); // last point = today
    expect(s[0].key).toBe('2026-05-11'); // 29 days earlier
    expect(s.every((p) => p.revenue === 0 && p.signups === 0 && p.enrollments === 0)).toBe(true);
    expect(s.every((p) => p.passRate === null)).toBe(true);
  });

  it('sums revenue and counts signups/enrollments into the right day', () => {
    const s = buildDailySeries(NOW, 30, {
      orders: [
        { created_at: iso(0), amount_vnd: 100000 },
        { created_at: iso(0), amount_vnd: 50000 },
        { created_at: iso(1), amount_vnd: 20000 },
      ],
      signups: [{ created_at: iso(0) }, { created_at: iso(0) }],
      enrollments: [{ created_at: iso(1) }],
      attempts: [],
    });
    const today = s[29];
    const yesterday = s[28];
    expect(today.revenue).toBe(150000);
    expect(today.signups).toBe(2);
    expect(yesterday.revenue).toBe(20000);
    expect(yesterday.enrollments).toBe(1);
  });

  it('computes pass-rate per day (>=60 passes), null when no attempts', () => {
    const s = buildDailySeries(NOW, 30, {
      orders: [],
      signups: [],
      enrollments: [],
      attempts: [
        { created_at: iso(0), score: 80 }, // pass
        { created_at: iso(0), score: 40 }, // fail
        { created_at: iso(0), score: 60 }, // pass (boundary)
      ],
    });
    expect(s[29].passRate).toBeCloseTo((2 / 3) * 100);
    expect(s[28].passRate).toBeNull(); // no attempts yesterday
  });

  it('excludes rows outside the window (older than days)', () => {
    const s = buildDailySeries(NOW, 7, {
      orders: [{ created_at: iso(30), amount_vnd: 999 }], // 30 days ago, outside 7-day window
      signups: [],
      enrollments: [],
      attempts: [],
    });
    expect(s).toHaveLength(7);
    expect(s.reduce((t, p) => t + p.revenue, 0)).toBe(0);
  });
});
