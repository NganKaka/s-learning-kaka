import { supabase } from './supabase';
import type { AnswerValue } from './quiz';

export interface MistakeEntry {
  id: string;
  user_id: string;
  question_id: string;
  quiz_id: string;
  course_id: string;
  wrong_answer: AnswerValue;
  correct_answer: AnswerValue;
  student_note: string | null;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  // joined
  prompt_md?: string;
  tags?: string[];
}

export async function addMistake(params: {
  userId: string;
  questionId: string;
  quizId: string;
  courseId: string;
  wrongAnswer: AnswerValue;
  correctAnswer: AnswerValue;
}): Promise<void> {
  await supabase.from('mistake_notebook').upsert({
    user_id: params.userId,
    question_id: params.questionId,
    quiz_id: params.quizId,
    course_id: params.courseId,
    wrong_answer: params.wrongAnswer,
    correct_answer: params.correctAnswer,
  }, { onConflict: 'user_id,question_id' });
}

export async function getMistakes(userId: string, courseId?: string): Promise<MistakeEntry[]> {
  let query = supabase
    .from('mistake_notebook')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (courseId) query = query.eq('course_id', courseId);
  const { data } = await query;
  return (data ?? []) as MistakeEntry[];
}

export async function resolveMistake(id: string): Promise<void> {
  await supabase.from('mistake_notebook').update({
    is_resolved: true,
    resolved_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function updateMistakeNote(id: string, note: string): Promise<void> {
  await supabase.from('mistake_notebook').update({ student_note: note }).eq('id', id);
}
