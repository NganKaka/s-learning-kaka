import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Lesson } from '../lib/database.types';

/**
 * The single access decision for a lesson. Shared by `Learn` and the quiz route
 * so the enrollment guard can't drift between them (a divergence here would let
 * a direct URL bypass enrollment). RLS on `lessons`/`quizzes` is the server-side
 * backstop; this is the client guard.
 *
 * A lesson is playable if it's a free preview OR the user is enrolled.
 */
export function canPlayLesson(lesson: Pick<Lesson, 'is_preview'>, enrolled: boolean): boolean {
  return lesson.is_preview || enrolled;
}

export interface LessonAccess {
  course: { id: string; slug: string; title: string } | null;
  lesson: Lesson | null;
  enrolled: boolean;
  /** is_preview OR enrolled — see canPlayLesson. */
  canPlay: boolean;
  loading: boolean;
  /** Course or lesson does not exist → caller shows 404 / redirects to /courses. */
  notFound: boolean;
  /** Resolved but not playable → caller redirects to the lesson (or /login). */
  locked: boolean;
}

const INITIAL: LessonAccess = {
  course: null,
  lesson: null,
  enrolled: false,
  canPlay: false,
  loading: true,
  notFound: false,
  locked: false,
};

/**
 * Resolve access to a lesson by course + lesson slug with minimal queries
 * (course id, the single target lesson, and the user's enrollment). Intended for
 * lightweight consumers like the dedicated quiz route — `Learn` keeps its own
 * bundled load (course + modules + all lessons) for navigation.
 */
export function useLessonAccess(courseSlug?: string, lessonSlug?: string): LessonAccess {
  const { user } = useAuth();
  const [state, setState] = useState<LessonAccess>(INITIAL);

  useEffect(() => {
    if (!courseSlug || !lessonSlug) {
      setState({ ...INITIAL, loading: false, notFound: true });
      return;
    }
    let cancelled = false;
    setState(INITIAL);

    (async () => {
      // Course (published only) — public read.
      const { data: courseRow } = await supabase
        .from('courses')
        .select('id, slug, title')
        .eq('slug', courseSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (cancelled) return;
      if (!courseRow) {
        setState({ ...INITIAL, loading: false, notFound: true });
        return;
      }
      const courseId = courseRow.id as string;

      // Target lesson within the course.
      const { data: lessonRow } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('slug', lessonSlug)
        .maybeSingle();

      if (cancelled) return;
      if (!lessonRow) {
        setState({ ...INITIAL, loading: false, notFound: true });
        return;
      }
      const lesson = lessonRow as Lesson;

      // Enrollment (active) for the signed-in user.
      let enrolled = false;
      if (user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (cancelled) return;
        enrolled = !!enr;
      }

      const canPlay = canPlayLesson(lesson, enrolled);
      setState({
        course: { id: courseId, slug: courseRow.slug as string, title: courseRow.title as string },
        lesson,
        enrolled,
        canPlay,
        loading: false,
        notFound: false,
        locked: !canPlay,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [courseSlug, lessonSlug, user?.id]);

  return state;
}
