import { supabase } from './supabase';

/**
 * Activity log + parent notification helpers.
 * Activity log entries are visible to linked parents via RLS.
 */

export interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function logActivity(userId: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
  await supabase.from('activity_log').insert({
    user_id: userId,
    action,
    metadata: metadata ?? null,
  });
}

export async function getActivityLog(userId: string, limit = 30): Promise<ActivityEntry[]> {
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityEntry[];
}

/**
 * Get class average score for a course (anonymized).
 * Returns the average of all students' best quiz scores.
 */
export async function getClassAverage(courseId: string): Promise<number | null> {
  const { data } = await supabase
    .from('course_leaderboard')
    .select('total_score, quizzes_completed')
    .eq('course_id', courseId);

  if (!data || data.length === 0) return null;
  const withQuizzes = data.filter((d) => d.quizzes_completed > 0);
  if (withQuizzes.length === 0) return null;
  const avg = withQuizzes.reduce((s, d) => s + d.total_score, 0) / withQuizzes.length;
  return avg;
}

/**
 * Get student's total score for comparison.
 */
export async function getStudentTotalScore(userId: string, courseId: string): Promise<number> {
  const { data } = await supabase
    .from('course_leaderboard')
    .select('total_score')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.total_score ?? 0;
}

/**
 * Get student's study goals (for parent visibility).
 */
export async function getStudentGoals(userId: string): Promise<{
  current: { lessons_target: number; flashcards_target: number; quizzes_target: number; lessons_done: number; flashcards_done: number; quizzes_done: number; met: boolean } | null;
  history: Array<{ week_start: string; met: boolean }>;
}> {
  const { data: goals } = await supabase
    .from('study_goals')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(8);

  if (!goals || goals.length === 0) return { current: null, history: [] };

  const current = goals[0];
  return {
    current: {
      lessons_target: current.lessons_target,
      flashcards_target: current.flashcards_target,
      quizzes_target: current.quizzes_target,
      lessons_done: current.lessons_done,
      flashcards_done: current.flashcards_done,
      quizzes_done: current.quizzes_done,
      met: current.met,
    },
    history: goals.map((g) => ({ week_start: g.week_start, met: g.met })),
  };
}

/**
 * Notify parent on milestone (called after significant events).
 * This logs the milestone to activity_log which parents can see.
 * Email notification is handled by the weekly report cron.
 */
export async function notifyMilestone(userId: string, milestone: string, details?: Record<string, unknown>): Promise<void> {
  await logActivity(userId, `milestone:${milestone}`, details);
}
