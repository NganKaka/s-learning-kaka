import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface CursorAwareProps {
  children: ReactNode;
  className?: string;
  /** How far away the cursor influences the element (px) */
  range?: number;
  /** Maximum lean intensity (px) */
  leanAmount?: number;
  /** Glow color when cursor is near */
  glowColor?: string;
}

/**
 * Wraps content that subtly leans toward the cursor when it approaches,
 * and pre-glows before the user actually hovers.
 */
export default function CursorAware({
  children,
  className = '',
  range = 200,
  leanAmount = 6,
  glowColor = 'rgba(233, 195, 73, 0.25)',
}: CursorAwareProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [proximity, setProximity] = useState(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const translateX = useTransform(xSpring, (v) => v * leanAmount);
  const translateY = useTransform(ySpring, (v) => v * leanAmount);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < range) {
        const factor = 1 - distance / range;
        x.set((dx / range) * factor);
        y.set((dy / range) * factor);
        setProximity(factor);
      } else {
        x.set(0);
        y.set(0);
        setProximity(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [range, x, y]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{ x: translateX, y: translateY }}
    >
      {/* Pre-hover glow that intensifies as cursor approaches */}
      <motion.div
        className="absolute inset-0 -z-10 rounded-2xl pointer-events-none"
        style={{
          opacity: proximity * 0.8,
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
      {children}
    </motion.div>
  );
}
