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
 * `days`-long daily series for the chart. Resilient to RLS errors — missing
 * data degrades to zeros rather than throwing.
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
    { count: users },
    { count: enrollmentsCount },
    { count: courses },
    { data: orders },
    { data: signupRows },
    { data: enrollmentRows },
    { data: attempts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('amount_vnd, created_at').eq('status', 'confirmed'),
    supabase.from('profiles').select('created_at').gte('created_at', windowStartIso),
    supabase
      .from('enrollments')
      .select('created_at')
      .eq('status', 'active')
      .gte('created_at', windowStartIso),
    supabase
      .from('quiz_attempts')
      .select('final_score, auto_score, created_at')
      .in('status', ['submitted', 'graded']),
  ]);

  const orderRows = (orders ?? []) as { amount_vnd: number; created_at: string }[];
  const totalRevenue = orderRows.reduce((s, o) => s + (o.amount_vnd ?? 0), 0);

  const attemptRows = (
    (attempts ?? []) as {
      final_score: number | null;
      auto_score: number | null;
      created_at: string;
    }[]
  ).map((a) => ({ created_at: a.created_at, score: a.final_score ?? a.auto_score ?? 0 }));
  const quizPassRate =
    attemptRows.length > 0
      ? (attemptRows.filter((a) => a.score >= PASS_THRESHOLD).length / attemptRows.length) * 100
      : 0;

  const signups = (signupRows ?? []) as DatedRow[];
  const recentSignups = signups.filter((s) => Date.parse(s.created_at) >= sevenDaysAgo).length;

  const totals: AdminTotals = {
    totalUsers: users ?? 0,
    totalEnrollments: enrollmentsCount ?? 0,
    totalRevenue,
    totalCourses: courses ?? 0,
    recentSignups,
    quizPassRate,
  };

  const series = buildDailySeries(now, days, {
    orders: orderRows.filter((o) => o.created_at >= windowStartIso),
    signups,
    enrollments: (enrollmentRows ?? []) as DatedRow[],
    attempts: attemptRows.filter((a) => a.created_at >= windowStartIso),
  });

  return { totals, series };
}
