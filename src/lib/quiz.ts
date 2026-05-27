import { supabase } from './supabase';

/**
 * Quiz types + data-access helpers.
 *
 * Mirrors the schema after migration 0010_quiz_advanced.sql.
 * Kept separate from `database.types.ts` since the quiz feature has
 * its own runtime concerns (file uploads, scoring) that warrant a
 * dedicated module.
 */

export type QuizQuestionType = 'single' | 'multi' | 'text' | 'file';
export type QuizGradingMode = 'max' | 'mean';
export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string | null;
  time_limit_seconds: number | null;
  max_attempts: number;
  grading_mode: QuizGradingMode;
  pass_threshold: number | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  prompt_md: string;
  type: QuizQuestionType;
  choices_jsonb: string[] | null;
  correct_jsonb: number[] | null;
  expected_text: string | null;
  explanation_md: string | null;
  points: number;
  order_index: number;
}

export type AnswerValue =
  | { kind: 'choice'; choices: number[] } // single/multi (1+ indexes)
  | { kind: 'text'; text: string }        // text answer
  | { kind: 'file'; file_ids: string[] }  // file: refs to quiz_submission_files.id
  | { kind: 'empty' };

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number;
  status: QuizAttemptStatus;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  tab_switches: number;
  answers_jsonb: Record<string, AnswerValue> | null;
  score: number;            // # of correctly auto-graded questions
  total: number;            // # of auto-gradable questions
  auto_score: number | null;   // 0-100 percentage of points auto-graded
  final_score: number | null;  // 0-100 percentage after teacher grading
  max_score: number;        // total points across all questions
  teacher_feedback: Record<string, { points: number; comment: string | null }> | null;
  created_at: string;
}

export interface QuizSubmissionFile {
  id: string;
  attempt_id: string;
  question_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  content_type: string | null;
  created_at: string;
}

export const QUIZ_BUCKET = 'quiz-submissions';
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadQuizForLesson(
  lessonId: string,
): Promise<{ quiz: Quiz | null; questions: QuizQuestion[] }> {
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (!quiz) return { quiz: null, questions: [] };

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('order_index', { ascending: true });

  return {
    quiz: quiz as Quiz,
    questions: ((questions ?? []) as QuizQuestion[]),
  };
}

export async function listUserAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: true });
  return (data ?? []) as QuizAttempt[];
}

// ---------------------------------------------------------------------------
// Attempt lifecycle
// ---------------------------------------------------------------------------

export async function startAttempt(params: {
  quizId: string;
  userId: string;
  attemptNumber: number;
  maxScore: number;
}): Promise<QuizAttempt | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: params.quizId,
      user_id: params.userId,
      attempt_number: params.attemptNumber,
      max_score: params.maxScore,
      status: 'in_progress',
      answers_jsonb: {},
      score: 0,
      total: 0,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {
    console.error('startAttempt failed:', error);
    return null;
  }
  return data as QuizAttempt;
}

export async function submitAttempt(
  attemptId: string,
  patch: {
    answers: Record<string, AnswerValue>;
    score: number;
    total: number;
    auto_score: number | null;
    final_score: number | null;
    time_spent_seconds: number;
    tab_switches: number;
  },
): Promise<void> {
  await supabase
    .from('quiz_attempts')
    .update({
      answers_jsonb: patch.answers,
      score: patch.score,
      total: patch.total,
      auto_score: patch.auto_score,
      final_score: patch.final_score,
      time_spent_seconds: patch.time_spent_seconds,
      tab_switches: patch.tab_switches,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attemptId);
}

// ---------------------------------------------------------------------------
// File uploads (student side)
// ---------------------------------------------------------------------------

export async function uploadQuizFile(params: {
  userId: string;
  attemptId: string;
  questionId: string;
  file: File;
}): Promise<QuizSubmissionFile | { error: string }> {
  if (params.file.size > MAX_UPLOAD_BYTES) {
    return { error: `Tệp quá lớn (tối đa ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` };
  }

  // Path convention enforced by storage RLS: <userId>/<attemptId>/<random>-<name>
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${params.userId}/${params.attemptId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(QUIZ_BUCKET)
    .upload(path, params.file, { contentType: params.file.type, upsert: false });
  if (uploadErr) return { error: uploadErr.message };

  const { data: row, error: insertErr } = await supabase
    .from('quiz_submission_files')
    .insert({
      attempt_id: params.attemptId,
      question_id: params.questionId,
      user_id: params.userId,
      file_path: path,
      file_name: params.file.name.slice(0, 200),
      file_size: params.file.size,
      content_type: params.file.type || null,
    })
    .select('*')
    .single();
  if (insertErr || !row) {
    // best-effort cleanup of orphaned object
    await supabase.storage.from(QUIZ_BUCKET).remove([path]);
    return { error: insertErr?.message ?? 'DB insert failed' };
  }
  return row as QuizSubmissionFile;
}

// ---------------------------------------------------------------------------
// Auto-grading
// ---------------------------------------------------------------------------

interface GradedQuestion {
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  autoGradable: boolean;
  isCorrect: boolean | null; // null when not auto-gradable
}

export function gradeAttempt(
  questions: QuizQuestion[],
  answers: Record<string, AnswerValue>,
): {
  perQuestion: GradedQuestion[];
  autoGradedPoints: number;
  autoGradedMax: number;
  totalMax: number;
  autoGradablePct: number; // 0..100 if auto-gradable questions exist
  finalPctIfNoTeacherGrading: number | null; // null if any teacher-graded q exists
  autoGradableCount: number;
  autoCorrectCount: number;
} {
  let totalMax = 0;
  let autoGradedPoints = 0;
  let autoGradedMax = 0;
  let autoCorrect = 0;
  let autoCount = 0;
  let hasTeacherGraded = false;
  const perQuestion: GradedQuestion[] = [];

  for (const q of questions) {
    totalMax += q.points;
    const a = answers[q.id];

    if (q.type === 'single' || q.type === 'multi') {
      autoGradedMax += q.points;
      autoCount += 1;
      const correct = (q.correct_jsonb ?? []).slice().sort();
      const got = a?.kind === 'choice' ? a.choices.slice().sort() : [];
      const isCorrect =
        correct.length === got.length && correct.every((v, i) => v === got[i]) && correct.length > 0;
      if (isCorrect) {
        autoGradedPoints += q.points;
        autoCorrect += 1;
      }
      perQuestion.push({
        questionId: q.id,
        awardedPoints: isCorrect ? q.points : 0,
        maxPoints: q.points,
        autoGradable: true,
        isCorrect,
      });
    } else if (q.type === 'text') {
      const expected = (q.expected_text ?? '').trim();
      if (expected.length > 0) {
        autoGradedMax += q.points;
        autoCount += 1;
        const got = a?.kind === 'text' ? a.text.trim() : '';
        const isCorrect = got.length > 0 && got.toLowerCase() === expected.toLowerCase();
        if (isCorrect) {
          autoGradedPoints += q.points;
          autoCorrect += 1;
        }
        perQuestion.push({
          questionId: q.id,
          awardedPoints: isCorrect ? q.points : 0,
          maxPoints: q.points,
          autoGradable: true,
          isCorrect,
        });
      } else {
        hasTeacherGraded = true;
        perQuestion.push({
          questionId: q.id,
          awardedPoints: 0,
          maxPoints: q.points,
          autoGradable: false,
          isCorrect: null,
        });
      }
    } else {
      // file
      hasTeacherGraded = true;
      perQuestion.push({
        questionId: q.id,
        awardedPoints: 0,
        maxPoints: q.points,
        autoGradable: false,
        isCorrect: null,
      });
    }
  }

  const autoGradablePct = autoGradedMax > 0 ? (autoGradedPoints / autoGradedMax) * 100 : 0;
  const finalPctIfNoTeacherGrading = hasTeacherGraded
    ? null
    : totalMax > 0
      ? (autoGradedPoints / totalMax) * 100
      : 0;

  return {
    perQuestion,
    autoGradedPoints,
    autoGradedMax,
    totalMax,
    autoGradablePct,
    finalPctIfNoTeacherGrading,
    autoGradableCount: autoCount,
    autoCorrectCount: autoCorrect,
  };
}

// Aggregate a student's attempts to a single grade based on quiz.grading_mode.
export function aggregateGrade(
  attempts: QuizAttempt[],
  mode: QuizGradingMode,
): { effectivePct: number | null; from: 'final' | 'auto'; count: number } {
  const submitted = attempts.filter((a) => a.status === 'submitted' || a.status === 'graded');
  if (submitted.length === 0) return { effectivePct: null, from: 'auto', count: 0 };

  const scores = submitted.map((a) => {
    if (a.final_score !== null && a.final_score !== undefined) return { value: a.final_score, from: 'final' as const };
    return { value: a.auto_score ?? 0, from: 'auto' as const };
  });

  const values = scores.map((s) => s.value);
  const effective =
    mode === 'max' ? Math.max(...values) : values.reduce((s, v) => s + v, 0) / values.length;

  // Pick the most-recent "from" so the dashboard can label it correctly
  const from = scores.some((s) => s.from === 'auto') ? 'auto' : 'final';

  return { effectivePct: effective, from, count: submitted.length };
}

export function formatTimeLeft(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
