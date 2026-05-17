import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Course, CourseWithCurriculum } from './database.types';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Public catalog: every published course. */
export function usePublishedCourses(): AsyncState<Course[]> {
  const [state, setState] = useState<AsyncState<Course[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) setState({ data: null, loading: false, error: error.message });
      else setState({ data: (data ?? []) as Course[], loading: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Single course with modules + lessons + instructor (for detail page). */
export function useCourse(slug: string | undefined): AsyncState<CourseWithCurriculum> {
  const [state, setState] = useState<AsyncState<CourseWithCurriculum>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!slug) {
      setState({ data: null, loading: false, error: 'No slug provided' });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            *,
            lessons (*)
          ),
          instructor:profiles!instructor_id (id, display_name, avatar_url)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setState({ data: null, loading: false, error: error.message });
        return;
      }
      if (!data) {
        setState({ data: null, loading: false, error: 'not_found' });
        return;
      }

      // Sort modules + lessons by order_index since the embed doesn't.
      const course = data as unknown as CourseWithCurriculum;
      course.modules = [...course.modules]
        .sort((a, b) => a.order_index - b.order_index)
        .map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.order_index - b.order_index) }));

      setState({ data: course, loading: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}

/** Single featured course for the homepage hero. */
export function useFeaturedCourse(): AsyncState<Course> {
  const [state, setState] = useState<AsyncState<Course>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) setState({ data: null, loading: false, error: error.message });
      else setState({ data: (data ?? null) as Course | null, loading: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} giờ` : `${hours}h ${rem}m`;
}

export function formatLessonDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
