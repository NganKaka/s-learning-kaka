import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  once?: boolean;
}

export function RevealText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 0.04,
  once = true,
}: RevealTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: '-50px' });
  const words = text.split(' ');

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split('').map((char, charIndex) => (
            <motion.span
              key={charIndex}
              initial={{ opacity: 0, y: 20, rotateX: -90 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, rotateX: 0 }
                  : { opacity: 0, y: 20, rotateX: -90 }
              }
              transition={{
                duration: 0.5,
                delay: delay + (wordIndex * 0.1 + charIndex * staggerDelay),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
              style={{ transformOrigin: 'bottom' }}
            >
              {char}
            </motion.span>
          ))}
          {wordIndex < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

interface ScrambleNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

export function ScrambleNumber({
  value,
  duration = 1500,
  className = '',
}: ScrambleNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <span ref={ref} className={className}>
      {isInView ? (
        <ScrambleAnimation value={value} duration={duration} />
      ) : (
        '0'
      )}
    </span>
  );
}

function ScrambleAnimation({ value, duration }: { value: number; duration: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  if (typeof window !== 'undefined' && ref.current === null) {
    setTimeout(() => {
      const target = String(value);
      const chars = '0123456789';
      let frame = 0;
      const totalFrames = Math.floor(duration / 50);

      const interval = setInterval(() => {
        if (!ref.current) return;
        frame++;

        if (frame >= totalFrames) {
          ref.current.textContent = target;
          clearInterval(interval);
          return;
        }

        const progress = frame / totalFrames;
        const lockedChars = Math.floor(target.length * progress);

        let result = '';
        for (let i = 0; i < target.length; i++) {
          if (i < lockedChars) {
            result += target[i];
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        ref.current.textContent = result;
      }, 50);
    }, 0);
  }

  return <span ref={ref}>0</span>;
}
