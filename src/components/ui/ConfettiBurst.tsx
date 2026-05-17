import { useState, MouseEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  rotation: number;
  shape: 'circle' | 'square';
}

interface ConfettiBurstProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  particleCount?: number;
  colors?: string[];
}

/**
 * Wraps a button-shaped child element. On click, emits a burst of
 * confetti particles from the click point that fly outward and fade.
 */
export default function ConfettiBurst({
  children,
  className = '',
  onClick,
  particleCount = 16,
  colors = ['#e9c349', '#22d3ee', '#a855f7', '#ffffff'],
}: ConfettiBurstProps) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; particles: Particle[] }>>([]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const burstId = Date.now();

    const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4,
      distance: 60 + Math.random() * 80,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 720 - 360,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }));

    setBursts((prev) => [...prev, { id: burstId, x, y, particles }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 900);

    onClick?.(e);
  };

  return (
    <button onClick={handleClick} className={`relative ${className}`}>
      {children}
      <AnimatePresence>
        {bursts.map((burst) => (
          <span
            key={burst.id}
            className="pointer-events-none absolute"
            style={{ left: burst.x, top: burst.y }}
            aria-hidden
          >
            {burst.particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
                animate={{
                  x: Math.cos(p.angle) * p.distance,
                  y: Math.sin(p.angle) * p.distance,
                  opacity: 0,
                  scale: 1.2,
                  rotate: p.rotation,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.shape === 'circle' ? '50%' : '2px',
                  boxShadow: `0 0 6px ${p.color}`,
                }}
              />
            ))}
          </span>
        ))}
      </AnimatePresence>
    </button>
  );
}
