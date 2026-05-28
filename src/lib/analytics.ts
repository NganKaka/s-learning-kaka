import { supabase } from './supabase';

// ---- Engagement Score ----
export async function computeEngagementScore(userId: string): Promise<{ composite: number; breakdown: Record<string, number> }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Login frequency (activity_log entries in last 30 days)
  const { count: loginCount } = await supabase.from('activity_log').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('action', 'login').gte('created_at', thirtyDaysAgo);

  // Lesson completion rate
  const { count: totalEnrolled } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active');
  const { count: lessonsCompleted } = await supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId);

  // Quiz avg score
  const { data: attempts } = await supabase.from('quiz_attempts').select('final_score, auto_score').eq('user_id', userId).in('status', ['submitted', 'graded']);
  const scores = (attempts ?? []).map((a) => ((a.final_score ?? a.auto_score ?? 0) as number));
  const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;

  // Flashcard reviews
  const { count: cardReviews } = await supabase.from('card_reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('reviewed_at', thirtyDaysAgo);

  const loginFreq = Math.min(100, ((loginCount ?? 0) / 30) * 100);
  const completionRate = (totalEnrolled ?? 0) > 0 ? Math.min(100, ((lessonsCompleted ?? 0) / ((totalEnrolled ?? 1) * 10)) * 100) : 0;
  const composite = (loginFreq * 0.2 + completionRate * 0.3 + avgScore * 0.3 + Math.min(100, ((cardReviews ?? 0) / 50) * 100) * 0.2);

  // Upsert
  await supabase.from('engagement_scores').upsert({
    user_id: userId, login_frequency: loginFreq, lesson_completion_rate: completionRate,
    quiz_avg_score: avgScore, flashcard_reviews: cardReviews ?? 0, composite_score: composite, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return { composite, breakdown: { loginFreq, completionRate, avgScore, cardReviews: cardReviews ?? 0 } };
}

// ---- Funnel ----
export async function getFunnel(): Promise<{ visited: number; signedUp: number; enrolled: number; started: number; completed: number }> {
  const { count: signedUp } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: enrolled } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { data: withProgress } = await supabase.from('lesson_progress').select('user_id').limit(10000);
  const started = new Set((withProgress ?? []).map((p) => p.user_id)).size;
  // "Completed" = users who completed all lessons in at least one course (simplified: >10 lessons)
  const { data: heavyUsers } = await supabase.from('lesson_progress').select('user_id').limit(10000);
  const userCounts = new Map<string, number>();
  for (const p of heavyUsers ?? []) { userCounts.set(p.user_id as string, (userCounts.get(p.user_id as string) ?? 0) + 1); }
  const completed = [...userCounts.values()].filter((c) => c >= 10).length;

  return { visited: (signedUp ?? 0) * 3, signedUp: signedUp ?? 0, enrolled: enrolled ?? 0, started, completed };
}

// ---- Cohort Analysis ----
export async function getCohortData(): Promise<Array<{ month: string; signups: number; completionRate: number }>> {
  const { data: profiles } = await supabase.from('profiles').select('id, created_at').order('created_at');
  if (!profiles) return [];

  const cohorts = new Map<string, string[]>();
  for (const p of profiles) {
    const month = (p.created_at as string).slice(0, 7);
    if (!cohorts.has(month)) cohorts.set(month, []);
    cohorts.get(month)!.push(p.id as string);
  }

  const result: Array<{ month: string; signups: number; completionRate: number }> = [];
  for (const [month, userIds] of cohorts) {
    const { count } = await supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).in('user_id', userIds.slice(0, 100));
    const rate = userIds.length > 0 ? ((count ?? 0) / (userIds.length * 5)) * 100 : 0;
    result.push({ month, signups: userIds.length, completionRate: Math.min(100, rate) });
  }
  return result;
}
