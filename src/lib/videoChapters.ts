import { supabase } from './supabase';

export interface VideoChapter {
  id: string;
  lesson_id: string;
  title: string;
  start_seconds: number;
  order_index: number;
}

export async function getChapters(lessonId: string): Promise<VideoChapter[]> {
  const { data } = await supabase.from('video_chapters').select('*').eq('lesson_id', lessonId).order('order_index');
  return (data ?? []) as VideoChapter[];
}

export async function saveChapter(lessonId: string, chapter: Partial<VideoChapter> & { title: string; start_seconds: number }): Promise<VideoChapter | null> {
  if (chapter.id) {
    const { data } = await supabase.from('video_chapters').update(chapter).eq('id', chapter.id).select('*').single();
    return data as VideoChapter | null;
  }
  const { data: existing } = await supabase.from('video_chapters').select('order_index').eq('lesson_id', lessonId).order('order_index', { ascending: false }).limit(1);
  const order = ((existing?.[0]?.order_index as number) ?? -1) + 1;
  const { data } = await supabase.from('video_chapters').insert({ lesson_id: lessonId, ...chapter, order_index: order }).select('*').single();
  return data as VideoChapter | null;
}

export async function deleteChapter(id: string): Promise<void> {
  await supabase.from('video_chapters').delete().eq('id', id);
}

export function formatChapterTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
