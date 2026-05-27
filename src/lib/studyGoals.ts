import { supabase } from './supabase';

export interface StudyGoal {
  id: string;
  user_id: string;
  week_start: string;
  lessons_target: number;
  flashcards_target: number;
  quizzes_target: number;
  lessons_done: number;
  flashcards_done: number;
  quizzes_done: number;
  met: boolean;
  created_at: string;
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

export async function getCurrentGoal(userId: string): Promise<StudyGoal | null> {
  const monday = getMonday();
  const { data } = await supabase
    .from('study_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', monday)
    .maybeSingle();
  return data as StudyGoal | null;
}

export async function upsertGoal(userId: string, targets: {
  lessons_target: number;
  flashcards_target: number;
  quizzes_target: number;
}): Promise<StudyGoal | null> {
  const monday = getMonday();
  const { data } = await supabase
    .from('study_goals')
    .upsert({
      user_id: userId,
      week_start: monday,
      ...targets,
    }, { onConflict: 'user_id,week_start' })
    .select('*')
    .single();
  return data as StudyGoal | null;
}

export async function incrementGoalProgress(
  userId: string,
  field: 'lessons_done' | 'flashcards_done' | 'quizzes_done',
): Promise<void> {
  const goal = await getCurrentGoal(userId);
  if (!goal) return;
  const newVal = goal[field] + 1;
  const patch: Record<string, number | boolean> = { [field]: newVal };
  // Check if goal is met
  const lessons = field === 'lessons_done' ? newVal : goal.lessons_done;
  const flashcards = field === 'flashcards_done' ? newVal : goal.flashcards_done;
  const quizzes = field === 'quizzes_done' ? newVal : goal.quizzes_done;
  if (lessons >= goal.lessons_target && flashcards >= goal.flashcards_target && quizzes >= goal.quizzes_target) {
    patch.met = true;
  }
  await supabase.from('study_goals').update(patch).eq('id', goal.id);
}
