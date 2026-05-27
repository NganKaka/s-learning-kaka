import { supabase } from './supabase';

export interface StudySession {
  id: string;
  user_id: string;
  course_id: string;
  activity_type: string;
  duration_seconds: number;
  date: string;
}

export async function logStudySession(params: {
  userId: string;
  courseId: string;
  activityType: 'video' | 'quiz' | 'flashcard' | 'drill' | 'notes';
  durationSeconds: number;
}): Promise<void> {
  await supabase.from('study_sessions').insert({
    user_id: params.userId,
    course_id: params.courseId,
    activity_type: params.activityType,
    duration_seconds: params.durationSeconds,
    date: new Date().toISOString().slice(0, 10),
  });
}

export async function getStudySessions(userId: string, days = 90): Promise<StudySession[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true });
  return (data ?? []) as StudySession[];
}

export function aggregateByDate(sessions: StudySession[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    map[s.date] = (map[s.date] ?? 0) + s.duration_seconds;
  }
  return map;
}
