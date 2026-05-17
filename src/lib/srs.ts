import { supabase } from './supabase';

/**
 * SM-2 spaced repetition: when a user reviews a card, compute the next
 * due date, ease factor, and interval based on their rating.
 *
 * Rating semantics (matching Anki / SuperMemo conventions):
 *   0 = Again (failed)
 *   1 = Hard
 *   2 = Good
 *   3 = Easy
 *
 * Ease starts at 2.5; floors at 1.3.
 * Interval grows: 1 day → 6 days → interval × ease, etc.
 */

export type Rating = 0 | 1 | 2 | 3;

export interface ReviewState {
  ease: number;
  interval_days: number;
  reps: number;
}

export function applyRating(prev: ReviewState, rating: Rating): ReviewState {
  let { ease, interval_days, reps } = prev;

  if (rating === 0) {
    // Failed — reset to learning
    return { ease: Math.max(1.3, ease - 0.2), interval_days: 0, reps: 0 };
  }

  reps += 1;

  // First two correct reviews use fixed intervals
  if (reps === 1) interval_days = 1;
  else if (reps === 2) interval_days = 6;
  else interval_days = Math.round(interval_days * ease);

  // Update ease based on quality
  if (rating === 1) ease = Math.max(1.3, ease - 0.15);
  else if (rating === 2) ease = ease; // unchanged
  else if (rating === 3) ease = ease + 0.15;

  return { ease, interval_days, reps };
}

export function nextDueAt(intervalDays: number, from: Date = new Date()): string {
  const d = new Date(from);
  // For 0-day interval (failed), put it back in 10 minutes
  if (intervalDays === 0) {
    d.setMinutes(d.getMinutes() + 10);
  } else {
    d.setDate(d.getDate() + intervalDays);
  }
  return d.toISOString();
}

interface ReviewInput {
  userId: string;
  cardId: string;
  rating: Rating;
}

/**
 * Submit a review. Idempotent insert via card_reviews (user_id, card_id)
 * unique constraint. Returns the new state.
 */
export async function submitReview(input: ReviewInput): Promise<{ error: string | null; state: ReviewState | null }> {
  const { userId, cardId, rating } = input;

  // Fetch existing review state, if any.
  const { data: existing } = await supabase
    .from('card_reviews')
    .select('ease, interval_days, reps')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .maybeSingle();

  const prev: ReviewState = existing
    ? { ease: existing.ease as number, interval_days: existing.interval_days as number, reps: existing.reps as number }
    : { ease: 2.5, interval_days: 0, reps: 0 };

  const next = applyRating(prev, rating);
  const due = nextDueAt(next.interval_days);

  const { error } = await supabase
    .from('card_reviews')
    .upsert(
      {
        user_id: userId,
        card_id: cardId,
        ease: next.ease,
        interval_days: next.interval_days,
        reps: next.reps,
        due_at: due,
        last_reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,card_id' },
    );

  if (error) return { error: error.message, state: null };
  return { error: null, state: next };
}

export interface DueCard {
  id: string;
  lesson_id: string;
  course_id: string;
  front_md: string;
  back_md: string;
  course_title: string | null;
  lesson_title: string | null;
}

/**
 * Cards due across all enrolled courses, ordered by due_at ascending. Limit
 * to 50 per session so a long-neglected queue doesn't overwhelm.
 *
 * Strategy: pull all enrolled course flashcards, then left-join card_reviews
 * to find which are due (reviews.due_at <= now()) or have never been reviewed.
 */
export async function fetchDueCards(userId: string): Promise<DueCard[]> {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  const courseIds = (enrollments ?? []).map((e) => e.course_id as string);
  if (courseIds.length === 0) return [];

  // All flashcards in enrolled courses
  const { data: cards } = await supabase
    .from('flashcards')
    .select('id, lesson_id, course_id, front_md, back_md, lessons(title), courses:lesson_id(title)')
    .in('course_id', courseIds);

  if (!cards) return [];

  // Pull review state for all those cards
  const cardIds = cards.map((c) => c.id as string);
  const { data: reviews } = await supabase
    .from('card_reviews')
    .select('card_id, due_at, reps')
    .eq('user_id', userId)
    .in('card_id', cardIds);

  const reviewMap = new Map<string, { due_at: string; reps: number }>();
  for (const r of reviews ?? []) {
    reviewMap.set(r.card_id as string, { due_at: r.due_at as string, reps: r.reps as number });
  }

  const now = new Date();

  // Pull course titles for display
  const { data: courseRows } = await supabase
    .from('courses')
    .select('id, title')
    .in('id', courseIds);
  const courseTitleMap = new Map<string, string>();
  for (const c of courseRows ?? []) courseTitleMap.set(c.id as string, c.title as string);

  return cards
    .filter((c) => {
      const r = reviewMap.get(c.id as string);
      if (!r) return true; // never reviewed → always due
      return new Date(r.due_at) <= now;
    })
    .map((c) => {
      const lessonObj = Array.isArray(c.lessons) ? c.lessons[0] : c.lessons;
      return {
        id: c.id as string,
        lesson_id: c.lesson_id as string,
        course_id: c.course_id as string,
        front_md: c.front_md as string,
        back_md: c.back_md as string,
        course_title: courseTitleMap.get(c.course_id as string) ?? null,
        lesson_title: (lessonObj as { title?: string } | undefined)?.title ?? null,
      };
    })
    .slice(0, 50);
}

export async function fetchLessonCards(lessonId: string): Promise<Array<{ id: string; front_md: string; back_md: string; order_index: number }>> {
  const { data } = await supabase
    .from('flashcards')
    .select('id, front_md, back_md, order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });
  return (data ?? []) as Array<{ id: string; front_md: string; back_md: string; order_index: number }>;
}
