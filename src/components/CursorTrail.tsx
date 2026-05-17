import { useEffect, useRef } from 'react';

type Dot = { x: number; y: number; born: number; size: number };

const LIFETIME = 400;
const SPAWN_INTERVAL = 28;

/**
 * Sparse golden particle trail behind the cursor. Pauses the RAF loop when
 * no dots remain and the cursor isn't active; rebinds on the next mousemove.
 * Hidden on touch and respects prefers-reduced-motion.
 */
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetFps = 30;
    const minFrame = 1000 / targetFps;
    let lastFrame = 0;
    let raf = 0;
    let running = false;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      start();
    };

    const handleLeave = () => {
      mouseRef.current.active = false;
    };

    const tick = (now: number) => {
      // 30fps cap — half the redraw cost, indistinguishable visually for a
      // sparse particle trail.
      if (now - lastFrame < minFrame) {
        if (mouseRef.current.active || dotsRef.current.length > 0) {
          raf = requestAnimationFrame(tick);
        } else {
          running = false;
        }
        return;
      }
      lastFrame = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (mouseRef.current.active && now - lastSpawnRef.current > SPAWN_INTERVAL) {
        dotsRef.current.push({
          x: mouseRef.current.x + (Math.random() - 0.5) * 6,
          y: mouseRef.current.y + (Math.random() - 0.5) * 6,
          born: now,
          size: 2 + Math.random() * 1.6,
        });
        lastSpawnRef.current = now;
      }

      const fresh: Dot[] = [];
      for (let i = 0; i < dotsRef.current.length; i++) {
        const d = dotsRef.current[i];
        const age = now - d.born;
        if (age > LIFETIME) continue;
        const t = age / LIFETIME;
        const alpha = (1 - t) * 0.6;
        ctx.beginPath();
        ctx.arc(d.x, d.y - t * 6, d.size * (1 - t * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 195, 73, ${alpha})`;
        ctx.fill();
        fresh.push(d);
      }
      dotsRef.current = fresh;

      if (!mouseRef.current.active && fresh.length === 0) {
        running = false;
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] hidden md:block"
    />
  );
}
