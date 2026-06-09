import { useCallback, useEffect, useRef, useState } from 'react';
import QuizReview from './QuizReview';
import PracticeMode from './PracticeMode';
import TimedDrill from './TimedDrill';
import { awardXp } from '../lib/xp';
import { type QuizAttempt } from '../lib/quiz';
import { useToast } from '../contexts/ToastContext';
import { useQuizSession } from './lesson-quiz/useQuizSession';
import { useQuizTimer } from './lesson-quiz/useQuizTimer';
import QuizStartScreen from './lesson-quiz/QuizStartScreen';
import QuizActiveView from './lesson-quiz/QuizActiveView';

/**
 * Lesson-attached quiz orchestrator.
 *
 * Delegates all state/side-effect logic to `useQuizSession` and `useQuizTimer`.
 * Renders one of four modes: quiz (start/active), review, practice, drill.
 *
 * Public API (props) is unchanged — consumers import this file's default export.
 */
interface LessonQuizProps {
  lessonId: string;
  userId: string;
  /** Fires when an attempt becomes active / inactive — lets a host page (e.g. the
   *  focused quiz route) hide its "back" affordance during an active attempt. */
  onAttemptActiveChange?: (active: boolean) => void;
  /** Fires once after the session resolves — `hasQuiz=false` lets a host page
   *  render its own empty state instead of this component's `null`. */
  onLoaded?: (info: { hasQuiz: boolean }) => void;
}

export default function LessonQuiz({
  lessonId,
  userId,
  onAttemptActiveChange,
  onLoaded,
}: LessonQuizProps) {
  const [mode, setMode] = useState<'quiz' | 'review' | 'practice' | 'drill'>('quiz');
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttempt | null>(null);
  const { showToast } = useToast();

  const {
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
  } = useQuizSession({ lessonId, userId });

  // Stable timeout callback — avoids re-registering the timer effect on every render.
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;
  const onTimeout = useCallback(() => {
    showToast('Hết giờ. Bài làm được nộp tự động.', 'info');
    handleSubmitRef.current('timeout');
  }, [showToast]);

  const { timeLeft } = useQuizTimer({
    activeAttempt,
    quiz,
    submittedRef,
    onTimeout,
  });

  // Notify host when an attempt becomes active/inactive (optional).
  const attemptActive = !!activeAttempt;
  useEffect(() => {
    onAttemptActiveChange?.(attemptActive);
  }, [attemptActive, onAttemptActiveChange]);

  // Notify host once the session resolves whether a quiz exists (optional).
  const loadNotifiedRef = useRef(false);
  useEffect(() => {
    if (loading || loadNotifiedRef.current) return;
    loadNotifiedRef.current = true;
    onLoaded?.({ hasQuiz: !!quiz && questions.length > 0 });
  }, [loading, quiz, questions.length, onLoaded]);

  if (loading) return null;
  if (!quiz || questions.length === 0) return null;

  // ----- Mode routing -----
  if (mode === 'review' && reviewAttempt) {
    return (
      <QuizReview
        attempt={reviewAttempt}
        questions={questions}
        onClose={() => {
          setMode('quiz');
          setReviewAttempt(null);
        }}
      />
    );
  }
  if (mode === 'practice') {
    return (
      <PracticeMode
        questions={questions.filter(
          (q) => q.type === 'single' || q.type === 'multi' || q.type === 'text',
        )}
        onExit={() => setMode('quiz')}
      />
    );
  }
  if (mode === 'drill') {
    return (
      <TimedDrill
        questions={questions}
        onComplete={() => {
          awardXp({ userId, source: 'drill_complete' });
        }}
        onExit={() => setMode('quiz')}
      />
    );
  }

  // ----- No active attempt: start / history screen -----
  if (!activeAttempt) {
    return (
      <QuizStartScreen
        quiz={quiz}
        questions={questions}
        previousAttempts={previousAttempts}
        justSubmitted={justSubmitted}
        totalMaxPoints={totalMaxPoints}
        onBeginAttempt={beginAttempt}
        onReviewAttempt={(a) => {
          setReviewAttempt(a);
          setMode('review');
        }}
        onPractice={() => setMode('practice')}
        onDrill={() => setMode('drill')}
      />
    );
  }

  // ----- Active attempt -----
  return (
    <QuizActiveView
      quiz={quiz}
      activeAttempt={activeAttempt}
      questions={questions}
      answers={answers}
      pendingFiles={pendingFiles}
      tabSwitches={tabSwitches}
      timeLeft={timeLeft}
      submitting={submitting}
      onAnswerChange={(questionId, next) => setAnswers((prev) => ({ ...prev, [questionId]: next }))}
      onFilesAdded={(questionId, files) =>
        setPendingFiles((prev) => ({
          ...prev,
          [questionId]: [
            ...(prev[questionId] ?? []),
            ...files.map((f) => ({ file: f, fileId: null, status: 'pending' as const })),
          ],
        }))
      }
      onFileRemove={(questionId, idx) =>
        setPendingFiles((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] ?? []).filter((_, i) => i !== idx),
        }))
      }
      onSubmit={() => handleSubmit('manual')}
    />
  );
}
