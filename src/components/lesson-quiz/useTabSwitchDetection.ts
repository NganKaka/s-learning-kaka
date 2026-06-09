import { useEffect, useRef, useState } from 'react';
import { type QuizAttempt } from '../../lib/quiz';

/**
 * Detects tab-switches and window-blur events while a quiz attempt is active.
 *
 * Fires on `visibilitychange` (tab hidden) and `window.blur` (window lost focus
 * while tab is visible). A 300 ms debounce prevents double-counting a single
 * user gesture that triggers both events.
 *
 * Shows a one-time toast warning via `onFirstSwitch`.
 * Returns the running switch count so the orchestrator can pass it to submit.
 */
export function useTabSwitchDetection({
  activeAttempt,
  onFirstSwitch,
}: {
  activeAttempt: QuizAttempt | null;
  /** Called exactly once when the first tab-switch is detected during an attempt. */
  onFirstSwitch: () => void;
}): { tabSwitches: number; resetTabSwitches: () => void } {
  const [tabSwitches, setTabSwitches] = useState(0);
  const toastShown = useRef(false);
  const onFirstSwitchRef = useRef(onFirstSwitch);

  useEffect(() => {
    onFirstSwitchRef.current = onFirstSwitch;
  }, [onFirstSwitch]);

  useEffect(() => {
    if (!activeAttempt) {
      toastShown.current = false;
      return;
    }

    let lastFire = 0;
    const DEBOUNCE_MS = 300;

    const bump = () => {
      const now = Date.now();
      if (now - lastFire < DEBOUNCE_MS) return;
      lastFire = now;
      setTabSwitches((n) => n + 1);
      if (!toastShown.current) {
        toastShown.current = true;
        onFirstSwitchRef.current();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') bump();
    };
    const onBlur = () => {
      if (document.visibilityState === 'visible') bump();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [activeAttempt]);

  const resetTabSwitches = () => {
    setTabSwitches(0);
    toastShown.current = false;
  };

  return { tabSwitches, resetTabSwitches };
}
