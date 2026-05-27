import { supabase } from './supabase';

export async function duplicateCourse(courseId: string, instructorId: string): Promise<string | null> {
  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single();
  if (!course) return null;

  const { data: newCourse } = await supabase.from('courses').insert({
    ...course, id: undefined, slug: `${course.slug}-copy-${Date.now().toString(36)}`,
    title: `${course.title} (bản sao)`, status: 'draft', instructor_id: instructorId,
    created_at: undefined, updated_at: undefined,
  }).select('id').single();
  if (!newCourse) return null;

  const { data: modules } = await supabase.from('modules').select('*').eq('course_id', courseId).order('order_index');
  for (const mod of modules ?? []) {
    const { data: newMod } = await supabase.from('modules').insert({
      course_id: newCourse.id, title: mod.title, order_index: mod.order_index,
    }).select('id').single();
    if (!newMod) continue;

    const { data: lessons } = await supabase.from('lessons').select('*').eq('module_id', mod.id).order('order_index');
    for (const lesson of lessons ?? []) {
      await supabase.from('lessons').insert({
        module_id: newMod.id, course_id: newCourse.id, slug: `${lesson.slug}-${Date.now().toString(36).slice(-4)}`,
        title: lesson.title, description: lesson.description, bunny_video_id: lesson.bunny_video_id,
        duration_seconds: lesson.duration_seconds, order_index: lesson.order_index, is_preview: lesson.is_preview,
      });
    }
  }
  return newCourse.id as string;
}

export async function duplicateModule(moduleId: string, courseId: string): Promise<string | null> {
  const { data: mod } = await supabase.from('modules').select('*').eq('id', moduleId).single();
  if (!mod) return null;
  const { data: existing } = await supabase.from('modules').select('order_index').eq('course_id', courseId).order('order_index', { ascending: false }).limit(1);
  const nextOrder = ((existing?.[0]?.order_index as number) ?? -1) + 1;

  const { data: newMod } = await supabase.from('modules').insert({
    course_id: courseId, title: `${mod.title} (bản sao)`, order_index: nextOrder,
  }).select('id').single();
  if (!newMod) return null;

  const { data: lessons } = await supabase.from('lessons').select('*').eq('module_id', moduleId).order('order_index');
  for (const lesson of lessons ?? []) {
    await supabase.from('lessons').insert({
      module_id: newMod.id, course_id: courseId, slug: `${lesson.slug}-${Date.now().toString(36).slice(-4)}`,
      title: lesson.title, description: lesson.description, bunny_video_id: lesson.bunny_video_id,
      duration_seconds: lesson.duration_seconds, order_index: lesson.order_index, is_preview: lesson.is_preview,
    });
  }
  return newMod.id as string;
}
