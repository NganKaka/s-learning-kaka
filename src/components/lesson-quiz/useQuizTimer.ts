import { useEffect, useRef, useState } from 'react';
import { type Quiz, type QuizAttempt } from '../../lib/quiz';

/**
 * Manages the countdown timer for a timed quiz attempt.
 *
 * - Derives time-left from the attempt's `started_at` + `quiz.time_limit_seconds`.
 * - Ticks every 1 000 ms via `window.setInterval`.
 * - Calls `onTimeout` once when `timeLeft` reaches 0, guarded by `submittedRef`
 *   to prevent double-submission if the student also clicks "Submit".
 *
 * IMPORTANT: `onTimeout` must be stable (wrapped in useCallback by the caller)
 * or this effect will re-fire on every render.
 */
export function useQuizTimer({
  activeAttempt,
  quiz,
  submittedRef,
  onTimeout,
}: {
  activeAttempt: QuizAttempt | null;
  quiz: Quiz | null;
  /** Shared guard ref — set to `true` by the submit handler before calling onTimeout. */
  submittedRef: React.MutableRefObject<boolean>;
  /** Called exactly once when the clock hits 0 and the attempt has not been submitted yet. */
  onTimeout: () => void;
}): { timeLeft: number | null } {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // ---- Countdown tick ----
  useEffect(() => {
    if (!activeAttempt || !quiz?.time_limit_seconds) {
      setTimeLeft(null);
      return;
    }
    const startMs = Date.parse(activeAttempt.started_at);
    if (Number.isNaN(startMs)) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const left = (quiz.time_limit_seconds ?? 0) - elapsed;
      setTimeLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeAttempt, quiz?.time_limit_seconds]);

  // ---- Auto-submit when time runs out ----
  // onTimeout is a ref-backed stable callback in the orchestrator, so this
  // effect only re-runs when timeLeft or activeAttempt changes.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && activeAttempt && !submittedRef.current) {
      onTimeoutRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, activeAttempt]);

  return { timeLeft };
}
