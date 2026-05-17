/**
 * Lenis is loaded lazily on the first programmatic scroll request, since
 * smoothWheel is off and the only reason we need it is for the locked
 * smooth `scrollTo` used by nav clicks. Native `scrollIntoView` handles
 * everything else — no upfront cost on initial Home load.
 */

type LenisInstance = {
  scrollTo: (target: HTMLElement | number, options?: { offset?: number; lock?: boolean }) => void;
  destroy: () => void;
  raf: (time: number) => void;
};

declare global {
  interface Window {
    __lenis?: LenisInstance;
  }
}

let initPromise: Promise<LenisInstance | null> | null = null;

function ensureLenis(): Promise<LenisInstance | null> {
  if (window.__lenis) return Promise.resolve(window.__lenis);
  if (initPromise) return initPromise;

  initPromise = import('lenis').then(({ default: Lenis }) => {
    const lenis = new Lenis({ smoothWheel: false, lerp: 0.35 }) as unknown as LenisInstance;
    window.__lenis = lenis;
    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    return lenis;
  }).catch(() => null);

  return initPromise;
}

export function smoothScrollTo(target: HTMLElement | number, options?: { offset?: number }) {
  ensureLenis().then((lenis) => {
    if (lenis) {
      lenis.scrollTo(target, { lock: true, offset: options?.offset });
      return;
    }
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      const offset = options?.offset ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
}

export default function SmoothScroll() {
  return null;
}
