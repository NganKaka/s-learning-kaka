import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface LiquidDividerProps {
  /** Color of the goo blobs - usually matches surrounding section accent */
  color?: string;
  /** Total height of the divider in px */
  height?: number;
  className?: string;
}

/**
 * Section divider with goo-filtered blobs that drift and morph as the user
 * scrolls past, making one section feel like it melts into the next.
 *
 * The SVG goo filter (gaussian blur + color matrix) is the classic technique:
 * blur fattens the blobs, then the matrix sharpens the alpha edge so the
 * overlap reads as one liquid mass instead of three blurred circles.
 */
export default function LiquidDivider({
  color = 'rgba(233, 195, 73, 0.4)',
  height = 160,
  className = '',
}: LiquidDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const offset1 = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const offset2 = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const offset3 = useTransform(scrollYProgress, [0, 1], [-10, 30]);
  const scaleY = useTransform(scrollYProgress, [0, 0.5, 1], [0.6, 1.1, 0.6]);

  return (
    <div
      ref={ref}
      className={`relative w-full pointer-events-none ${className}`}
      style={{ height }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0 flex items-center justify-around" style={{ filter: 'url(#liquid-goo)' }}>
        <motion.div
          style={{ y: offset1, scaleY, backgroundColor: color }}
          className="h-20 w-20 rounded-full blur-[2px]"
        />
        <motion.div
          style={{ y: offset2, scaleY, backgroundColor: color }}
          className="h-28 w-28 rounded-full blur-[2px]"
        />
        <motion.div
          style={{ y: offset3, scaleY, backgroundColor: color }}
          className="h-24 w-24 rounded-full blur-[2px]"
        />
        <motion.div
          style={{ y: offset1, scaleY, backgroundColor: color }}
          className="h-16 w-16 rounded-full blur-[2px]"
        />
        <motion.div
          style={{ y: offset2, scaleY, backgroundColor: color }}
          className="h-24 w-24 rounded-full blur-[2px]"
        />
      </div>
    </div>
  );
}
