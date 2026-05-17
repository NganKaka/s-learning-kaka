import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useActiveSection, SECTION_IDS, type SectionId } from '../contexts/ActiveSectionContext';

const LABELS: Record<SectionId, string> = {
  hero: 'Home',
  about: 'About',
  academics: 'Academics',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  testimonials: 'Testimonials',
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function scramble(target: string, progress: number): string {
  const reveal = Math.floor(target.length * progress);
  let out = '';
  for (let i = 0; i < target.length; i += 1) {
    out += i < reveal ? target[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return out;
}

/**
 * Vertical chapter marker pinned to the left edge of the viewport.
 * Subscribes to ActiveSectionContext — no own scroll listener.
 */
export default function ChapterLabel() {
  const { activeId } = useActiveSection();
  const sectionId: SectionId = activeId || 'hero';
  const sectionIndex = SECTION_IDS.indexOf(sectionId);
  const [display, setDisplay] = useState(LABELS[sectionId].toUpperCase());
  const lastTargetRef = useRef(LABELS[sectionId].toUpperCase());

  useEffect(() => {
    const target = LABELS[sectionId].toUpperCase();
    if (target === lastTargetRef.current) return;
    lastTargetRef.current = target;

    let frame = 0;
    const total = 14;
    const id = setInterval(() => {
      frame += 1;
      setDisplay(scramble(target, frame / total));
      if (frame >= total) {
        setDisplay(target);
        clearInterval(id);
      }
    }, 22);
    return () => clearInterval(id);
  }, [sectionId]);

  const numLabel = String(sectionIndex).padStart(2, '0');

  return (
    <div
      aria-hidden
      className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-3 pointer-events-none select-none"
    >
      <span className="block h-12 w-px bg-gradient-to-b from-transparent to-primary/40" />
      <div
        className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.32em]"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        <span className="text-primary/80 tabular-nums">{numLabel}</span>
        <span className="text-secondary/30">/</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={sectionId}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.18 }}
            className="text-cyan-200/80"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="block h-12 w-px bg-gradient-to-t from-transparent to-cyan-300/40" />
    </div>
  );
}
