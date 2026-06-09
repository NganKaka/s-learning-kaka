import { useCallback, useRef, useState } from 'react';
import QuizReview from './QuizReview';
import PracticeMode from './PracticeMode';
import TimedDrill from './TimedDrill';
import { awardXp } from '../lib/xp';
import { type QuizAttempt } from '../lib/quiz';
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
export default function LessonQuiz({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [mode, setMode] = useState<'quiz' | 'review' | 'practice' | 'drill'>('quiz');
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttempt | null>(null);

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
    handleSubmitRef.current('timeout');
  }, []);

  const { timeLeft } = useQuizTimer({
    activeAttempt,
    quiz,
    submittedRef,
    onTimeout,
  });

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
