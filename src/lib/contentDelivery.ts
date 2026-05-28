import { supabase } from './supabase';

// ---- Video Position & Speed ----
export interface VideoPosition {
  position_seconds: number;
  speed: number;
}

export async function getVideoPosition(userId: string, lessonId: string): Promise<VideoPosition> {
  const { data } = await supabase.from('video_positions').select('position_seconds, speed').eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle();
  return { position_seconds: (data?.position_seconds as number) ?? 0, speed: (data?.speed as number) ?? 1.0 };
}

export async function saveVideoPosition(userId: string, lessonId: string, position: number, speed: number): Promise<void> {
  await supabase.from('video_positions').upsert({ user_id: userId, lesson_id: lessonId, position_seconds: Math.floor(position), speed, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
}

// ---- Lesson Attachments ----
export interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
}

export async function getAttachments(lessonId: string): Promise<LessonAttachment[]> {
  const { data } = await supabase.from('lesson_attachments').select('*').eq('lesson_id', lessonId).order('created_at');
  return (data ?? []) as LessonAttachment[];
}

export async function uploadAttachment(lessonId: string, userId: string, file: File): Promise<LessonAttachment | null> {
  const path = `attachments/${lessonId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabase.storage.from('quiz-submissions').upload(path, file, { contentType: file.type });
  if (error) return null;
  const { data } = await supabase.from('lesson_attachments').insert({ lesson_id: lessonId, file_name: file.name, file_path: path, file_size: file.size, content_type: file.type, uploaded_by: userId }).select('*').single();
  return data as LessonAttachment | null;
}

export async function deleteAttachment(id: string, filePath: string): Promise<void> {
  await supabase.storage.from('quiz-submissions').remove([filePath]);
  await supabase.from('lesson_attachments').delete().eq('id', id);
}

export function getAttachmentUrl(filePath: string): string {
  const { data } = supabase.storage.from('quiz-submissions').getPublicUrl(filePath);
  return data.publicUrl;
}

// ---- Simple Markdown Preview ----
export function renderMarkdownPreview(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="rounded bg-white/10 px-1 py-0.5 text-xs">$1</code>')
    .replace(/\n/g, '<br/>');
}
