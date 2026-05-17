import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Row {
  label: string;
  value: string;
  accent?: 'gold' | 'cyan';
}

interface SpecSheetProps {
  rows: Row[];
}

/**
 * Datasheet-style block: each row reads as `LABEL ........ value`, with the
 * leader dots filling whatever horizontal space is between label and value.
 * Rows fade + type in with a small stagger when the section enters view.
 */
export default function SpecSheet({ rows }: SpecSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="space-y-1.5 font-tech text-[12px] uppercase tracking-[0.18em]">
      {rows.map((row, i) => (
        <SpecRow
          key={row.label}
          label={row.label}
          value={row.value}
          accent={row.accent ?? (i % 2 === 0 ? 'gold' : 'cyan')}
          inView={inView}
          delay={i * 90}
        />
      ))}
    </div>
  );
}

function SpecRow({
  label,
  value,
  accent,
  inView,
  delay,
}: {
  label: string;
  value: string;
  accent: 'gold' | 'cyan';
  inView: boolean;
  delay: number;
}) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const total = value.length;
    const timeoutId = window.setTimeout(() => {
      const id = window.setInterval(() => {
        i += 1;
        setTyped(value.slice(0, i));
        if (i >= total) window.clearInterval(id);
      }, 18);
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [inView, value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.35, delay: delay / 1000, ease: 'easeOut' }}
      className="flex items-baseline gap-3"
    >
      <span className="text-secondary/55 shrink-0">{label}</span>
      <span
        aria-hidden
        className="flex-1 h-px self-center border-b border-dashed border-white/15"
      />
      <span className={`shrink-0 normal-case tracking-normal ${accent === 'gold' ? 'text-primary/90' : 'text-cyan-200/90'}`}>
        {typed}
        {typed.length < value.length && (
          <span className="inline-block w-[6px] h-[1em] bg-current align-text-bottom animate-pulse" />
        )}
      </span>
    </motion.div>
  );
}
