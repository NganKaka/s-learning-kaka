import { supabase } from './supabase';

const DAY_MS = 86400000;
const PASS_THRESHOLD = 60;

export interface DailyPoint {
  /** yyyy-mm-dd (UTC) — stable key. */
  key: string;
  /** dd/MM short label for the axis. */
  label: string;
  revenue: number;
  signups: number;
  enrollments: number;
  /** Pass-rate % for the day, or null when there were no attempts (line gaps). */
  passRate: number | null;
}

export interface AdminTotals {
  totalUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalCourses: number;
  recentSignups: number;
  quizPassRate: number;
}

interface DatedRow {
  created_at: string;
}

/** UTC day key (yyyy-mm-dd) for an ISO timestamp. */
function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Pure: build a zero-filled daily series ending today (UTC) going back `days`.
 * `now` is injected so this stays deterministic and testable.
 */
export function buildDailySeries(
  now: number,
  days: number,
  input: {
    orders: (DatedRow & { amount_vnd: number })[];
    signups: DatedRow[];
    enrollments: DatedRow[];
    attempts: (DatedRow & { score: number })[];
  },
): DailyPoint[] {
  const revenue = new Map<string, number>();
  const signups = new Map<string, number>();
  const enrollments = new Map<string, number>();
  const attemptTotal = new Map<string, number>();
  const attemptPass = new Map<string, number>();

  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const o of input.orders) add(revenue, o.created_at.slice(0, 10), o.amount_vnd ?? 0);
  for (const s of input.signups) add(signups, s.created_at.slice(0, 10), 1);
  for (const e of input.enrollments) add(enrollments, e.created_at.slice(0, 10), 1);
  for (const a of input.attempts) {
    const k = a.created_at.slice(0, 10);
    add(attemptTotal, k, 1);
    if (a.score >= PASS_THRESHOLD) add(attemptPass, k, 1);
  }

  const todayUtc = Math.floor(now / DAY_MS) * DAY_MS;
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const ms = todayUtc - i * DAY_MS;
    const key = dayKey(ms);
    const d = new Date(ms);
    const label = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const total = attemptTotal.get(key) ?? 0;
    out.push({
      key,
      label,
      revenue: revenue.get(key) ?? 0,
      signups: signups.get(key) ?? 0,
      enrollments: enrollments.get(key) ?? 0,
      passRate: total > 0 ? ((attemptPass.get(key) ?? 0) / total) * 100 : null,
    });
  }
  return out;
}

/**
 * Fetch admin dashboard stats: the headline totals (for the cards) and a
 * `days`-long daily series for the chart.
 *
 * The all-time totals (counts + revenue sum + pass-rate) are computed
 * server-side by the `admin_stats_totals` RPC so we never ship whole tables to
 * the browser; only the bounded `days`-window rows are fetched for the series.
 * Resilient: a missing RPC / RLS error degrades to zeros rather than throwing.
 */
export async function fetchAdminStats(
  now: number = Date.now(),
  days = 30,
): Promise<{ totals: AdminTotals; series: DailyPoint[] }> {
  const windowStartIso = new Date(
    Math.floor(now / DAY_MS) * DAY_MS - (days - 1) * DAY_MS,
  ).toISOString();
  const sevenDaysAgo = now - 7 * DAY_MS;

  const [
    { data: totalsRow, error: totalsErr },
    { data: orders },
    { data: signupRows },
    { data: enrollmentRows },
    { data: attempts },
  ] = await Promise.all([
    supabase.rpc('admin_stats_totals'),
    supabase
      .from('orders')
      .select('amount_vnd, created_at')
      .eq('status', 'confirmed')
      .gte('created_at', windowStartIso),
    supabase.from('profiles').select('created_at').gte('created_at', windowStartIso),
    supabase
      .from('enrollments')
      .select('created_at')
      .eq('status', 'active')
      .gte('created_at', windowStartIso),
    supabase
      .from('quiz_attempts')
      .select('final_score, auto_score, created_at')
      .in('status', ['submitted', 'graded'])
      .gte('created_at', windowStartIso),
  ]);

  if (totalsErr) console.error('admin_stats_totals RPC failed:', totalsErr.message);
  const t = (totalsRow ?? {}) as Partial<AdminTotals>;

  const signups = (signupRows ?? []) as DatedRow[];
  const recentSignups = signups.filter((s) => Date.parse(s.created_at) >= sevenDaysAgo).length;

  const totals: AdminTotals = {
    totalUsers: t.totalUsers ?? 0,
    totalEnrollments: t.totalEnrollments ?? 0,
    totalRevenue: t.totalRevenue ?? 0,
    totalCourses: t.totalCourses ?? 0,
    recentSignups,
    quizPassRate: t.quizPassRate ?? 0,
  };

  const attemptRows = (
    (attempts ?? []) as {
      final_score: number | null;
      auto_score: number | null;
      created_at: string;
    }[]
  ).map((a) => ({ created_at: a.created_at, score: a.final_score ?? a.auto_score ?? 0 }));

  const series = buildDailySeries(now, days, {
    orders: (orders ?? []) as (DatedRow & { amount_vnd: number })[],
    signups,
    enrollments: (enrollmentRows ?? []) as DatedRow[],
    attempts: attemptRows,
  });

  return { totals, series };
}
