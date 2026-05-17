import { memo, useEffect, useRef } from 'react';

const PARTICLE_COUNT = 20;
const MOUSE_RADIUS = 180;
const PULL_STRENGTH = 0.04;
const MAX_LINK_DIST = 120;
const CELL = 130;

const Constellations = memo(function Constellations() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let particles: Particle[] = [];
    let animationFrameId = 0;
    let visible = true;
    let onScreen = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible && onScreen && !reduced) start();
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    class Particle {
      x = Math.random() * canvas!.width;
      y = Math.random() * canvas!.height;
      vx = (Math.random() - 0.5) * 0.3;
      vy = (Math.random() - 0.5) * 0.3;

      draw(boost: number) {
        const radius = 1.5 + boost * 1.5;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(233, 195, 73, ${0.6 + boost * 0.4})`;
        ctx!.fill();
      }

      update(): number {
        let proximityBoost = 0;
        const m = mouseRef.current;
        if (m.active) {
          const dx = m.x - this.x;
          const dy = m.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const factor = 1 - dist / MOUSE_RADIUS;
            this.vx += (dx / dist) * PULL_STRENGTH * factor;
            this.vy += (dy / dist) * PULL_STRENGTH * factor;
            proximityBoost = factor;
          }
        }

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1.2) {
          this.vx = (this.vx / speed) * 1.2;
          this.vy = (this.vy / speed) * 1.2;
        }

        this.vx *= 0.98;
        this.vy *= 0.98;

        if (Math.abs(this.vx) < 0.1) this.vx += (Math.random() - 0.5) * 0.03;
        if (Math.abs(this.vy) < 0.1) this.vy += (Math.random() - 0.5) * 0.03;

        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas!.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas!.height) this.vy = -this.vy;

        return proximityBoost;
      }
    }

    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

    const drawStaticFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) p.draw(0);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const boosts: number[] = new Array(particles.length);
      const cols = Math.ceil(canvas.width / CELL) + 1;
      const grid: number[][] = [];

      for (let i = 0; i < particles.length; i += 1) {
        boosts[i] = particles[i].update();
        particles[i].draw(boosts[i]);
        const cx = Math.floor(particles[i].x / CELL);
        const cy = Math.floor(particles[i].y / CELL);
        const key = cy * cols + cx;
        (grid[key] ||= []).push(i);
      }

      const neighborOffsets = [0, 1, cols - 1, cols, cols + 1];
      for (const key in grid) {
        const cell = grid[key];
        const k = Number(key);
        for (const off of neighborOffsets) {
          const other = grid[k + off];
          if (!other) continue;
          for (let a = 0; a < cell.length; a += 1) {
            const i = cell[a];
            const startB = off === 0 ? a + 1 : 0;
            for (let b = startB; b < other.length; b += 1) {
              const j = other[b];
              if (i === j) continue;
              const pi = particles[i];
              const pj = particles[j];
              const dx = pi.x - pj.x;
              const dy = pi.y - pj.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < MAX_LINK_DIST) {
                ctx.beginPath();
                const baseOpacity = 0.25 - distance / 480;
                const boost = Math.max(boosts[i], boosts[j]);
                const opacity = Math.min(0.6, baseOpacity + boost * 0.4);
                ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
                ctx.lineWidth = 0.8 + boost * 0.6;
                ctx.moveTo(pi.x, pi.y);
                ctx.lineTo(pj.x, pj.y);
                ctx.stroke();
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const start = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(animate);
    };

    const stop = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onScreen = entry.isIntersecting;
        }
        if (reduced) {
          drawStaticFrame();
          return;
        }
        if (onScreen && visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    if (reduced) {
      drawStaticFrame();
    } else {
      start();
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none mix-blend-screen" />;
});

export default Constellations;
