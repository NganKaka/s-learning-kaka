import { supabase } from './supabase';

export interface Bookmark {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
  lesson_title?: string;
  course_slug?: string;
  lesson_slug?: string;
}

export async function toggleBookmark(userId: string, lessonId: string): Promise<boolean> {
  const { data } = await supabase.from('bookmarks').select('id').eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle();
  if (data) {
    await supabase.from('bookmarks').delete().eq('id', data.id);
    return false;
  }
  await supabase.from('bookmarks').insert({ user_id: userId, lesson_id: lessonId });
  return true;
}

export async function isBookmarked(userId: string, lessonId: string): Promise<boolean> {
  const { data } = await supabase.from('bookmarks').select('id').eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle();
  return !!data;
}

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const { data } = await supabase.from('bookmarks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  const lessonIds = data.map((b) => b.lesson_id);
  const { data: lessons } = await supabase.from('lessons').select('id, title, slug, course_id').in('id', lessonIds);
  const courseIds = [...new Set((lessons ?? []).map((l) => l.course_id))];
  const { data: courses } = await supabase.from('courses').select('id, slug').in('id', courseIds);
  return data.map((b) => {
    const lesson = lessons?.find((l) => l.id === b.lesson_id);
    const course = courses?.find((c) => c.id === lesson?.course_id);
    return { ...b, lesson_title: lesson?.title, course_slug: course?.slug, lesson_slug: lesson?.slug } as Bookmark;
  });
}
