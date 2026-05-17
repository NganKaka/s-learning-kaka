import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const POINTER_QUERY = '(hover: hover) and (pointer: fine)';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
  /** Render Pokemon-card style iridescent sheen that tracks cursor angle. */
  holographic?: boolean;
}

export default function TiltCard({
  children,
  className = '',
  intensity = 8,
  perspective = 1000,
  holographic = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [interactive, setInteractive] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(POINTER_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(POINTER_QUERY);
    const update = () => setInteractive(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const rotateX = useTransform(ySpring, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-intensity, intensity]);

  const sheenAngle = useTransform([xSpring, ySpring], ([sx, sy]) => {
    const ang = (Math.atan2(sy as number, sx as number) * 180) / Math.PI + 180;
    return `${ang}deg`;
  });
  const sheenStrength = useTransform([xSpring, ySpring], ([sx, sy]) => {
    const r = Math.min(0.5, Math.hypot(sx as number, sy as number));
    return r * 1.4;
  });

  const sheenBackground = useTransform(
    sheenAngle,
    (a) =>
      `conic-gradient(from ${a}, transparent 0deg, rgba(233,195,73,0.55) 50deg, rgba(34,211,238,0.55) 110deg, rgba(168,85,247,0.55) 170deg, rgba(244,114,182,0.55) 230deg, transparent 290deg, transparent 360deg)`,
  );

  if (!interactive) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPos = (e.clientX - rect.left) / rect.width - 0.5;
    const yPos = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPos);
    y.set(yPos);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective,
      }}
      className={`relative ${className}`}
    >
      <div style={{ transform: 'translateZ(50px)', transformStyle: 'preserve-3d' }}>
        {children}
      </div>

      {holographic && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-color-dodge"
          style={{
            background: sheenBackground,
            opacity: sheenStrength,
            transform: 'translateZ(60px)',
            filter: 'blur(8px) saturate(1.2)',
          }}
        />
      )}
    </motion.div>
  );
}
