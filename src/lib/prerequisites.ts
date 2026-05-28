import { supabase } from './supabase';

export interface Prerequisite {
  id: string;
  lesson_id: string;
  required_lesson_id: string;
}

export async function getPrerequisites(lessonId: string): Promise<Prerequisite[]> {
  const { data } = await supabase.from('prerequisites').select('*').eq('lesson_id', lessonId);
  return (data ?? []) as Prerequisite[];
}

export async function checkPrerequisitesMet(userId: string, lessonId: string): Promise<{ met: boolean; missing: string[] }> {
  const prereqs = await getPrerequisites(lessonId);
  if (prereqs.length === 0) return { met: true, missing: [] };

  const requiredIds = prereqs.map((p) => p.required_lesson_id);
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .in('lesson_id', requiredIds);

  const completedIds = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const missing = requiredIds.filter((id) => !completedIds.has(id));
  return { met: missing.length === 0, missing };
}

export async function addPrerequisite(lessonId: string, requiredLessonId: string): Promise<void> {
  await supabase.from('prerequisites').upsert({ lesson_id: lessonId, required_lesson_id: requiredLessonId }, { onConflict: 'lesson_id,required_lesson_id' });
}

export async function removePrerequisite(lessonId: string, requiredLessonId: string): Promise<void> {
  await supabase.from('prerequisites').delete().eq('lesson_id', lessonId).eq('required_lesson_id', requiredLessonId);
}
