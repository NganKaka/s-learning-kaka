import { lazy, Suspense, useEffect, useState } from 'react';

const CommandPalette = lazy(() => import('./CommandPalette'));

/**
 * Global ⌘K / Ctrl+K listener. Lazy-loads the palette on first open so its
 * blog-post import + framer-motion modal cost zero bytes until used.
 */
export default function CommandPaletteHost() {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setTouched(true);
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!touched) return null;

  return (
    <Suspense fallback={null}>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </Suspense>
  );
}
