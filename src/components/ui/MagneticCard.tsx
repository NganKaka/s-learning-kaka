import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export default function MagneticCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
  const sx = useSpring(x, { stiffness: 160, damping: 18 });
  const sy = useSpring(y, { stiffness: 160, damping: 18 });

  const rotateX = useTransform(sy, [-0.5, 0.5], ['12deg', '-12deg']);
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-12deg', '12deg']);
  const tx = useTransform(sx, [-0.5, 0.5], ['-16px', '16px']);
  const ty = useTransform(sy, [-0.5, 0.5], ['-16px', '16px']);

  if (!interactive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        x.set(mx / rect.width - 0.5);
        y.set(my / rect.height - 0.5);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX, rotateY, x: tx, y: ty, transformStyle: 'preserve-3d' }}
      className={className}
    >
      <div style={{ transform: 'translateZ(24px)' }} className="h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}
