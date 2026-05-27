import { supabase } from './supabase';

/**
 * Generate CSV export of student progress for a course.
 */
export async function exportStudentReport(courseId: string, instructorId: string): Promise<string> {
  const { data: enrollments } = await supabase.from('enrollments').select('user_id').eq('course_id', courseId).eq('status', 'active');
  if (!enrollments) return '';
  const userIds = enrollments.map((e) => e.user_id as string);
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
  const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', courseId);
  const totalLessons = lessons?.length ?? 0;
  const { data: progress } = await supabase.from('lesson_progress').select('user_id').eq('course_id', courseId).in('user_id', userIds);
  const { data: quizzes } = await supabase.from('quizzes').select('id').in('lesson_id', (lessons ?? []).map((l) => l.id));
  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: attempts } = await supabase.from('quiz_attempts').select('user_id, auto_score, final_score').in('quiz_id', quizIds).in('status', ['submitted', 'graded']);

  const progressByUser = new Map<string, number>();
  for (const p of progress ?? []) progressByUser.set(p.user_id as string, (progressByUser.get(p.user_id as string) ?? 0) + 1);

  const scoresByUser = new Map<string, number[]>();
  for (const a of (attempts ?? [])) {
    const uid = a.user_id as string;
    if (!scoresByUser.has(uid)) scoresByUser.set(uid, []);
    scoresByUser.get(uid)!.push((a.final_score ?? a.auto_score ?? 0) as number);
  }

  const rows = [['Tên', 'Bài hoàn thành', 'Tổng bài', '% Hoàn thành', 'Điểm TB quiz', 'Số lượt thi'].join(',')];
  for (const uid of userIds) {
    const name = profiles?.find((p) => p.id === uid)?.display_name ?? uid.slice(0, 8);
    const done = progressByUser.get(uid) ?? 0;
    const pct = totalLessons > 0 ? ((done / totalLessons) * 100).toFixed(0) : '0';
    const scores = scoresByUser.get(uid) ?? [];
    const avg = scores.length > 0 ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1) : '—';
    rows.push([`"${name}"`, done, totalLessons, `${pct}%`, avg, scores.length].join(','));
  }
  return rows.join('\n');
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
