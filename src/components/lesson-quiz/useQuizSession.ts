import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import {
  type AnswerValue,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  gradeAttempt,
  listUserAttempts,
  loadQuizForLesson,
} from '../../lib/quiz';
import { type PendingFile } from './types';
import {
  buildSubmittedAttempt,
  createAttempt,
  persistAttempt,
  runPostSubmitSideEffects,
  uploadStagedFiles,
} from './quiz-submit-helpers';
import { useTabSwitchDetection } from './useTabSwitchDetection';

/**
 * Manages the full lifecycle of a quiz session:
 *   - Loading quiz + previous attempts on mount / lessonId change.
 *   - Tab-switch detection (delegated to useTabSwitchDetection).
 *   - `beginAttempt` — creates a new attempt row and resets local state.
 *   - `handleSubmit` — uploads staged files, grades, persists, awards XP/badges.
 *
 * Heavy helpers live in `quiz-submit-helpers.ts`; tab tracking in
 * `useTabSwitchDetection.ts` — this file stays under 200 LOC.
 */
export function useQuizSession({ lessonId, userId }: { lessonId: string; userId: string }) {
  const { showToast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, PendingFile[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<QuizAttempt | null>(null);

  const startedAtRef = useRef<number | null>(null);
  /** Guard against double-submission (timer fires simultaneously with a manual click). */
  const submittedRef = useRef(false);

  const totalMaxPoints = useMemo(() => questions.reduce((s, q) => s + q.points, 0), [questions]);

  // Tab-switch tracking while an attempt is in-progress
  const { tabSwitches, resetTabSwitches } = useTabSwitchDetection({
    activeAttempt,
    onFirstSwitch: useCallback(() => {
      showToast(
        'Bạn đã rời tab khi đang làm bài. Hành vi này được ghi lại và gửi cho giáo viên.',
        'error',
      );
    }, [showToast]),
  });

  // ----- Load quiz + previous attempts -----
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    setLoading(true);
    setActiveAttempt(null);
    setJustSubmitted(null);

    (async () => {
      const { quiz: q, questions: qs } = await loadQuizForLesson(lessonId);
      if (cancelled) return;
      setQuiz(q);
      setQuestions(qs);

      if (q && userId) {
        const attempts = await listUserAttempts(q.id, userId);
        if (cancelled) return;
        setPreviousAttempts(attempts);
      } else {
        setPreviousAttempts([]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, userId]);

  // ----- Begin a new attempt -----
  const beginAttempt = useCallback(async () => {
    if (!quiz) return;
    const created = await createAttempt({
      quizId: quiz.id,
      userId,
      previousAttempts,
      totalMaxPoints,
    });
    if (!created) {
      showToast('Không thể bắt đầu lượt làm. Thử lại sau.', 'error');
      return;
    }
    submittedRef.current = false;
    startedAtRef.current = Date.now();
    setAnswers({});
    setPendingFiles({});
    resetTabSwitches();
    setActiveAttempt(created);
    setJustSubmitted(null);
  }, [quiz, previousAttempts, userId, totalMaxPoints, showToast, resetTabSwitches]);

  // ----- Submit -----
  const handleSubmit = useCallback(
    async (reason: 'manual' | 'timeout') => {
      if (!quiz || !activeAttempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const { finalAnswers, uploadFailed } = await uploadStagedFiles({
        questions,
        pendingFiles,
        answers,
        userId,
        attemptId: activeAttempt.id,
        onError: (msg) => showToast(msg, 'error'),
      });

      const elapsedSeconds = startedAtRef.current
        ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
        : 0;

      const graded = gradeAttempt(questions, finalAnswers);
      await persistAttempt({
        attemptId: activeAttempt.id,
        finalAnswers,
        graded,
        elapsedSeconds,
        tabSwitches,
      });

      const submittedAttempt = buildSubmittedAttempt(
        activeAttempt,
        finalAnswers,
        graded,
        elapsedSeconds,
        tabSwitches,
      );

      setActiveAttempt(null);
      setJustSubmitted(submittedAttempt);
      setPreviousAttempts((prev) => [...prev, submittedAttempt]);
      setSubmitting(false);

      runPostSubmitSideEffects({
        userId,
        attemptId: activeAttempt.id,
        quiz,
        questions,
        finalAnswers,
        gradedPerQuestion: graded.perQuestion,
        finalPct: graded.finalPctIfNoTeacherGrading,
      });

      if (!uploadFailed) {
        showToast(
          reason === 'timeout' ? 'Hết giờ — bài đã nộp.' : 'Đã nộp bài. Kết quả gửi tới giáo viên.',
          'success',
        );
      }
    },
    [activeAttempt, answers, pendingFiles, questions, quiz, showToast, tabSwitches, userId],
  );

  return {
    quiz,
    questions,
    previousAttempts,
    loading,
    activeAttempt,
    answers,
    setAnswers,
    pendingFiles,
    setPendingFiles,
    tabSwitches,
    submitting,
    justSubmitted,
    submittedRef,
    totalMaxPoints,
    beginAttempt,
    handleSubmit,
  };
}
