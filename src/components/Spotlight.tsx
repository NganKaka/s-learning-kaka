import { useEffect } from 'react';

interface SpotlightProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Soft spotlight following the cursor. Implemented as a fixed gradient div
 * whose center is driven by CSS custom properties — a single rAF-throttled
 * mousemove writes them, no React rerender, no framer spring.
 */
export default function Spotlight({
  className = '',
  size = 400,
  color = 'rgba(233, 195, 73, 0.15)',
}: SpotlightProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const root = document.documentElement;
    let raf = 0;
    let nextX = -1000;
    let nextY = -1000;
    let queued = false;

    const flush = () => {
      queued = false;
      root.style.setProperty('--spotlight-x', `${nextX}px`);
      root.style.setProperty('--spotlight-y', `${nextY}px`);
      root.style.setProperty('--spotlight-opacity', '1');
    };

    const onMove = (e: MouseEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      root.style.setProperty('--spotlight-opacity', '0');
    };

    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed z-30 ${className}`}
      style={{
        left: 'var(--spotlight-x, -1000px)',
        top: 'var(--spotlight-y, -1000px)',
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: 'var(--spotlight-opacity, 0)',
        transition: 'opacity 0.3s, left 80ms linear, top 80ms linear',
      }}
    />
  );
}
