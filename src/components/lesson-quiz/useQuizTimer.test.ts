import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { act } from 'react';
import { useQuizTimer } from './useQuizTimer';
import { type Quiz, type QuizAttempt } from '../../lib/quiz';

// Minimal valid fixtures — only the fields useQuizTimer reads matter.
function makeQuiz(timeLimit: number | null): Quiz {
  return {
    id: 'quiz-1',
    lesson_id: 'lesson-1',
    title: 'T',
    time_limit_seconds: timeLimit,
    max_attempts: 3,
    grading_mode: 'max',
    pass_threshold: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeAttempt(startedAt: string): QuizAttempt {
  return {
    id: 'att-1',
    user_id: 'u-1',
    quiz_id: 'quiz-1',
    attempt_number: 1,
    status: 'in_progress',
    started_at: startedAt,
    submitted_at: null,
    time_spent_seconds: 0,
    tab_switches: 0,
    answers_jsonb: null,
    score: 0,
    total: 0,
    auto_score: null,
    final_score: null,
    max_score: 0,
    teacher_feedback: null,
    created_at: startedAt,
  };
}

/** Renders the hook with a fresh submittedRef so the timer's guard works. */
function renderTimer(args: {
  activeAttempt: QuizAttempt | null;
  quiz: Quiz | null;
  onTimeout: () => void;
  submitted?: boolean;
}) {
  return renderHook(() => {
    const submittedRef = useRef(args.submitted ?? false);
    return useQuizTimer({
      activeAttempt: args.activeAttempt,
      quiz: args.quiz,
      submittedRef,
      onTimeout: args.onTimeout,
    });
  });
}

describe('useQuizTimer', () => {
  beforeEach(() => {
    // Anchor wall clock so started_at math is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null timeLeft when quiz is untimed', () => {
    const { result } = renderTimer({
      activeAttempt: makeAttempt('2026-01-01T12:00:00.000Z'),
      quiz: makeQuiz(null),
      onTimeout: vi.fn(),
    });
    expect(result.current.timeLeft).toBeNull();
  });

  it('counts down from the remaining time on a timed attempt', () => {
    // Started 10s ago, 60s limit -> 50s left.
    const { result } = renderTimer({
      activeAttempt: makeAttempt('2026-01-01T11:59:50.000Z'),
      quiz: makeQuiz(60),
      onTimeout: vi.fn(),
    });
    expect(result.current.timeLeft).toBe(50);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.timeLeft).toBe(45);
  });

  it('fires onTimeout exactly once when the clock runs out', () => {
    // Model the real contract: the submit handler (useQuizSession handleSubmit)
    // sets submittedRef.current = true SYNCHRONOUSLY before any await. The timer's
    // single-fire guarantee depends entirely on that — so onTimeout must set it.
    // Regression guard: if that assignment ever moves after an await, this fails.
    const onTimeout = vi.fn();
    const submittedRef = { current: false };
    onTimeout.mockImplementation(() => {
      submittedRef.current = true;
    });
    const startedAt = '2026-01-01T11:59:02.000Z'; // 58s ago, 60s limit -> 2s left
    renderHook(() =>
      useQuizTimer({
        activeAttempt: makeAttempt(startedAt),
        quiz: makeQuiz(60),
        submittedRef,
        onTimeout,
      }),
    );
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000); // cross zero
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    // Keep ticking — the guard must prevent any second fire.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not fire onTimeout when already submitted (guard ref)', () => {
    const onTimeout = vi.fn();
    renderTimer({
      activeAttempt: makeAttempt('2026-01-01T11:59:00.000Z'), // already expired
      quiz: makeQuiz(60),
      onTimeout,
      submitted: true,
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
