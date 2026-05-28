import { useEffect } from 'react';

/**
 * Adds visible focus rings only when navigating via keyboard.
 * Removes them on mouse click to avoid visual noise.
 */
export function useKeyboardFocusRings() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
    };
    const handleMouseDown = () => document.body.classList.remove('keyboard-nav');
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

/**
 * Hook for keyboard navigation in lists (arrow keys + enter).
 */
export function useArrowNav(containerRef: React.RefObject<HTMLElement | null>, selector = 'button, [role="option"]') {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKey = (e: KeyboardEvent) => {
      const items = Array.from(el.querySelectorAll<HTMLElement>(selector));
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      }
    };
    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [containerRef, selector]);
}

/**
 * CSS to add to index.css:
 * body.keyboard-nav *:focus { outline: 2px solid #67e8f9; outline-offset: 2px; }
 * body:not(.keyboard-nav) *:focus { outline: none; }
 */
export const FOCUS_RING_CSS = `
body.keyboard-nav *:focus { outline: 2px solid #67e8f9; outline-offset: 2px; border-radius: 4px; }
body:not(.keyboard-nav) *:focus { outline: none; }
`;
