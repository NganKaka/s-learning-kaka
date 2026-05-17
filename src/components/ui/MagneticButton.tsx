import { ReactNode, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** How far the button can move toward the cursor (px) */
  strength?: number;
  /** Distance threshold to start magnetic effect (px) */
  range?: number;
  onClick?: () => void;
}

/**
 * Button that subtly pulls toward the cursor when nearby,
 * making the click feel "guided" toward the button.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  range = 80,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 250, mass: 0.5 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

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

      if (distance < rect.width / 2 + range) {
        x.set(dx * strength);
        y.set(dy * strength);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [range, strength, x, y]);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      style={{ x: xSpring, y: ySpring }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
