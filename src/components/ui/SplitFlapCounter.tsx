import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface SplitFlapDigitProps {
  target: string;
  delay?: number;
  /** Bumping this re-triggers the flip even if `target` didn't change. */
  retriggerKey?: number;
}

function SplitFlapDigit({ target, delay = 0, retriggerKey = 0 }: SplitFlapDigitProps) {
  const [current, setCurrent] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;

    if (!/^\d$/.test(target)) {
      setCurrent(target);
      return;
    }

    let frame = 0;
    const total = parseInt(target, 10) + 8;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        frame++;
        if (frame >= total) {
          setCurrent(target);
          clearInterval(interval);
        } else {
          setCurrent(String(frame % 10));
        }
      }, 70);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [target, isInView, delay, retriggerKey]);

  return (
    <span
      ref={ref}
      className="relative inline-block overflow-hidden rounded-md bg-on-surface/10 px-1.5 py-0.5 mx-[1px] font-mono align-baseline"
      style={{ minWidth: '0.7em', textAlign: 'center' }}
    >
      <motion.span
        key={current}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="inline-block"
        style={{ transformOrigin: 'center top' }}
      >
        {current}
      </motion.span>
    </span>
  );
}

interface SplitFlapCounterProps {
  value: string;
  className?: string;
}

/**
 * Airport-style split-flap counter. Each character flips through digits
 * until landing on the target. Non-digit characters render as static.
 *
 * Re-triggers automatically every time the user pauses scrolling for
 * ~1500ms, so the value 'wakes up' rather than freezing after first view.
 */
export default function SplitFlapCounter({ value, className = '' }: SplitFlapCounterProps) {
  const chars = value.split('');
  const [retriggerKey, setRetriggerKey] = useState(0);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        // Re-roll the flip when the user stops scrolling
        setRetriggerKey((k) => k + 1);
      }, 1500);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <span className={className}>
      {chars.map((char, i) => (
        <SplitFlapDigit key={i} target={char} delay={i * 60} retriggerKey={retriggerKey} />
      ))}
    </span>
  );
}
