import { useEffect, useRef, useState } from 'react';

interface ScrambleTextProps {
  text: string;
  className?: string;
  trigger?: 'hover' | 'mount';
  duration?: number;
}

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';

export default function ScrambleText({
  text,
  className = '',
  trigger = 'hover',
  duration = 800,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const scramble = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    let frame = 0;
    const totalFrames = Math.floor(duration / 30);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const lockedChars = Math.floor(text.length * progress);

      let result = '';
      for (let i = 0; i < text.length; i++) {
        if (i < lockedChars || text[i] === ' ') {
          result += text[i];
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      setDisplayText(result);

      if (frame >= totalFrames) {
        setDisplayText(text);
        if (intervalRef.current) clearInterval(intervalRef.current);
        isAnimatingRef.current = false;
      }
    }, 30);
  };

  useEffect(() => {
    if (trigger === 'mount') {
      scramble();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className={className}
      onMouseEnter={trigger === 'hover' ? scramble : undefined}
    >
      {displayText}
    </span>
  );
}
