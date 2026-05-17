import { useEffect, useState } from 'react';

interface NameDecodeProps {
  text: string;
  className?: string;
  /** Total animation length in ms. Defaults to 700. */
  duration?: number;
  /** How long each character spends scrambling before locking. */
  charLockDuration?: number;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*';

/**
 * Hero name reveal: each character cycles through random glyphs then locks
 * into place. Cascades letter-by-letter so the whole word resolves left-to-
 * right.
 *
 * Uses a single rAF loop, no timers per character.
 */
export default function NameDecode({
  text,
  className = '',
  duration = 700,
  charLockDuration = 260,
}: NameDecodeProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      setFrame(elapsed);
      if (elapsed < duration + charLockDuration) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, charLockDuration, text]);

  const stagger = duration / Math.max(text.length, 1);

  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => {
        if (ch === ' ') return <span key={i}>&nbsp;</span>;
        const charStart = i * stagger;
        const charEnd = charStart + charLockDuration;
        const isScrambling = frame >= charStart && frame < charEnd;
        const isLocked = frame >= charEnd;

        let display: string;
        if (isLocked) display = ch;
        else if (isScrambling) display = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        else display = ' ';

        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-block"
            style={{ minWidth: '0.55em' }}
          >
            <span
              style={{
                opacity: isLocked ? 1 : isScrambling ? 0.85 : 0,
                color: isLocked ? undefined : 'rgba(34,211,238,0.85)',
                transition: 'opacity 80ms linear',
              }}
            >
              {display}
            </span>
          </span>
        );
      })}
    </span>
  );
}
