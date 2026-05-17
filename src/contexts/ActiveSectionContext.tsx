import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Single source of truth for "which section is active right now."
 * One scroll listener, one rAF, one set of getBoundingClientRect calls per
 * tick. Nav, section indicator, and chapter label all subscribe via context
 * instead of each running their own scroll listener.
 *
 * Sections that don't exist (e.g. on /blog) just collapse to defaults; the
 * provider stays mounted at the App level.
 */

const SECTION_IDS = [
  'hero',
  'about',
  'academics',
  'experience',
  'skills',
  'projects',
  'testimonials',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface ActiveSectionContext {
  activeId: SectionId | '';
  /** Lock a target temporarily (during smooth-scroll click). */
  lockTo: (id: SectionId, ms?: number) => void;
}

const Ctx = createContext<ActiveSectionContext>({ activeId: '', lockTo: () => {} });

export function ActiveSectionProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<SectionId | ''>('');
  const lockedRef = useRef<{ id: SectionId; until: number } | null>(null);

  useEffect(() => {
    let queued = false;
    let raf = 0;

    const compute = () => {
      queued = false;
      const now = performance.now();

      // Honour active lock if it's still within window AND target isn't yet
      // settled; release once target's top is within 80px of viewport top.
      if (lockedRef.current) {
        const { id, until } = lockedRef.current;
        if (now < until) {
          const targetEl = document.getElementById(id);
          if (targetEl) {
            const { top } = targetEl.getBoundingClientRect();
            if (Math.abs(top - 100) < 60) {
              lockedRef.current = null;
            } else {
              setActiveId(id);
              return;
            }
          } else {
            lockedRef.current = null;
          }
        } else {
          lockedRef.current = null;
        }
      }

      const marker = 140;
      let next: SectionId | '' = '';
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= marker) next = id;
      }
      if (window.scrollY < 120) next = '';
      setActiveId(next);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const lockTo = (id: SectionId, ms = 3000) => {
    lockedRef.current = { id, until: performance.now() + ms };
    setActiveId(id);
  };

  return <Ctx.Provider value={{ activeId, lockTo }}>{children}</Ctx.Provider>;
}

export function useActiveSection() {
  return useContext(Ctx);
}

export type { SectionId };
export { SECTION_IDS };
