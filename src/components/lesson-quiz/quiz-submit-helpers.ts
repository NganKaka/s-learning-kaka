/**
 * Pure helpers for quiz attempt lifecycle: begin, persist, post-submit effects.
 *
 * Kept separate from useQuizSession to keep that hook under 200 LOC.
 * All logic is identical to the original LessonQuiz.tsx implementation.
 */
import { awardXp } from '../../lib/xp';
import { checkAndAwardBadges } from '../../lib/badges';
import { addMistake } from '../../lib/mistakeNotebook';
import { incrementGoalProgress } from '../../lib/studyGoals';
import {
  type AnswerValue,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  startAttempt,
  submitAttempt,
  uploadQuizFile,
} from '../../lib/quiz';
import { type PendingFile } from './types';

/** Subset of gradeAttempt's return used across persist/build helpers. */
interface GradeSummary {
  autoCorrectCount: number;
  autoGradableCount: number;
  autoGradedMax: number;
  autoGradablePct: number;
  finalPctIfNoTeacherGrading: number | null;
}

/**
 * Create a new attempt row in the database.
 * Returns the created attempt or null on failure.
 */
export async function createAttempt({
  quizId,
  userId,
  previousAttempts,
  totalMaxPoints,
}: {
  quizId: string;
  userId: string;
  previousAttempts: QuizAttempt[];
  totalMaxPoints: number;
}): Promise<QuizAttempt | null> {
  const nextNumber = Math.max(0, ...previousAttempts.map((a) => a.attempt_number)) + 1;
  return startAttempt({ quizId, userId, attemptNumber: nextNumber, maxScore: totalMaxPoints });
}

/** Upload staged files for file-type questions; returns finalAnswers + uploadFailed flag. */
export async function uploadStagedFiles({
  questions,
  pendingFiles,
  answers,
  userId,
  attemptId,
  onError,
}: {
  questions: QuizQuestion[];
  pendingFiles: Record<string, PendingFile[]>;
  answers: Record<string, AnswerValue>;
  userId: string;
  attemptId: string;
  onError: (msg: string) => void;
}): Promise<{ finalAnswers: Record<string, AnswerValue>; uploadFailed: boolean }> {
  const finalAnswers: Record<string, AnswerValue> = { ...answers };
  let uploadFailed = false;

  for (const q of questions) {
    if (q.type !== 'file') continue;
    const staged = pendingFiles[q.id] ?? [];
    if (staged.length === 0) continue;

    const uploadedIds: string[] = [];
    for (const item of staged) {
      if (item.status === 'uploaded' && item.fileId) {
        uploadedIds.push(item.fileId);
        continue;
      }
      const result = await uploadQuizFile({
        userId,
        attemptId,
        questionId: q.id,
        file: item.file,
      });
      if ('error' in result) {
        uploadFailed = true;
        onError(`Tải lên thất bại (${item.file.name}): ${result.error}`);
      } else {
        uploadedIds.push(result.id);
      }
    }
    if (uploadedIds.length > 0) {
      finalAnswers[q.id] = { kind: 'file', file_ids: uploadedIds };
    }
  }

  return { finalAnswers, uploadFailed };
}

/** Fire-and-forget: XP award, badge check, mistake logging, goal increment. */
export function runPostSubmitSideEffects({
  userId,
  attemptId,
  quiz,
  questions,
  finalAnswers,
  gradedPerQuestion,
  finalPct,
}: {
  userId: string;
  attemptId: string;
  quiz: Quiz;
  questions: QuizQuestion[];
  finalAnswers: Record<string, AnswerValue>;
  gradedPerQuestion: Array<{
    questionId: string;
    autoGradable: boolean;
    isCorrect: boolean | null;
  }>;
  finalPct: number | null;
}): void {
  awardXp({ userId, source: 'quiz_submit', referenceId: attemptId }).then(({ streak }) => {
    checkAndAwardBadges(userId, { quizScore: finalPct ?? undefined, streak });
  });

  incrementGoalProgress(userId, 'quizzes_done');

  // Log wrong auto-gradable answers to the mistake notebook
  for (const pq of gradedPerQuestion) {
    if (pq.autoGradable && pq.isCorrect === false) {
      const q = questions.find((qq) => qq.id === pq.questionId);
      if (q) {
        addMistake({
          userId,
          questionId: q.id,
          quizId: quiz.id,
          courseId: '',
          wrongAnswer: finalAnswers[q.id] ?? { kind: 'empty' },
          correctAnswer: { kind: 'empty' },
        });
      }
    }
  }
}

/** Persist the graded attempt to the DB; centralises payload shape so the hook stays lean. */
export async function persistAttempt({
  attemptId,
  finalAnswers,
  graded,
  elapsedSeconds,
  tabSwitches,
}: {
  attemptId: string;
  finalAnswers: Record<string, AnswerValue>;
  graded: GradeSummary;
  elapsedSeconds: number;
  tabSwitches: number;
}): Promise<void> {
  await submitAttempt(attemptId, {
    answers: finalAnswers,
    score: graded.autoCorrectCount,
    total: graded.autoGradableCount,
    auto_score: graded.autoGradedMax > 0 ? +graded.autoGradablePct.toFixed(2) : null,
    final_score:
      graded.finalPctIfNoTeacherGrading !== null
        ? +graded.finalPctIfNoTeacherGrading.toFixed(2)
        : null,
    time_spent_seconds: elapsedSeconds,
    tab_switches: tabSwitches,
  });
}

/** Build the local QuizAttempt snapshot that replaces activeAttempt after submit. */
export function buildSubmittedAttempt(
  activeAttempt: QuizAttempt,
  finalAnswers: Record<string, AnswerValue>,
  graded: GradeSummary,
  elapsedSeconds: number,
  tabSwitches: number,
): QuizAttempt {
  return {
    ...activeAttempt,
    answers_jsonb: finalAnswers,
    score: graded.autoCorrectCount,
    total: graded.autoGradableCount,
    auto_score: graded.autoGradedMax > 0 ? +graded.autoGradablePct.toFixed(2) : null,
    final_score:
      graded.finalPctIfNoTeacherGrading !== null
        ? +graded.finalPctIfNoTeacherGrading.toFixed(2)
        : null,
    time_spent_seconds: elapsedSeconds,
    tab_switches: tabSwitches,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };
}
