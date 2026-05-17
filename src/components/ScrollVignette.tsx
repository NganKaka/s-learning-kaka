import { useEffect } from 'react';

/**
 * Radial vignette overlay whose intensity scales with scroll progress.
 * Uses a single rAF-throttled scroll listener that writes a CSS custom
 * property — no framer-motion subscription, no React rerender per frame.
 */
export default function ScrollVignette() {
  useEffect(() => {
    let raf = 0;
    let queued = false;

    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const opacity = progress < 0.6
        ? (progress / 0.6) * 0.32
        : 0.32 + ((progress - 0.6) / 0.4) * 0.13;
      document.documentElement.style.setProperty('--scroll-vignette', opacity.toFixed(3));
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[40]"
      style={{
        opacity: 'var(--scroll-vignette, 0)',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.85) 100%)',
        transition: 'opacity 120ms linear',
      }}
    />
  );
}
