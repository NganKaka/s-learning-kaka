import { ReactNode, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useVelocity, useScroll } from 'framer-motion';

interface ScrollSkewProps {
  children: ReactNode;
  className?: string;
  /** Maximum skew in degrees */
  maxSkew?: number;
  /** Maximum scale factor (e.g. 1.05 = 5% squash/stretch) */
  maxScale?: number;
}

/**
 * Wraps content that skews + scales based on scroll velocity.
 * Fast scrolling tilts and stretches the content in the scroll direction;
 * it springs back to normal when scrolling stops.
 */
export default function ScrollSkew({
  children,
  className = '',
  maxSkew = 4,
  maxScale = 1.04,
}: ScrollSkewProps) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 30,
    stiffness: 250,
    mass: 0.5,
  });

  // Map velocity (px/sec) to skew degrees - clamp at ±2500 for stability
  const skewY = useTransform(
    smoothVelocity,
    [-2500, 0, 2500],
    [-maxSkew, 0, maxSkew],
    { clamp: true },
  );

  // Slight Y-scale (squash/stretch) tied to velocity sign
  const scaleY = useTransform(
    smoothVelocity,
    [-2500, 0, 2500],
    [maxScale, 1, maxScale],
    { clamp: true },
  );

  return (
    <motion.div
      style={{ skewY, scaleY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
