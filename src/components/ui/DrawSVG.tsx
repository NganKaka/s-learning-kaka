import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface DrawSVGProps {
  className?: string;
  duration?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export default function DrawSVG({
  className = '',
  duration = 2,
  strokeColor = 'currentColor',
  strokeWidth = 2,
}: DrawSVGProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d="M 10 40 Q 50 10 100 40 T 190 40"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration, ease: 'easeInOut' }}
      />
    </svg>
  );
}

interface AnimatedUnderlineProps {
  className?: string;
  color?: string;
  width?: string;
}

export function AnimatedUnderline({
  className = '',
  color = 'rgb(233, 195, 73)',
  width = '100%',
}: AnimatedUnderlineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div
        initial={{ scaleX: 0, originX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 h-[3px] rounded-full"
        style={{
          backgroundColor: color,
          width,
        }}
      />
    </div>
  );
}
