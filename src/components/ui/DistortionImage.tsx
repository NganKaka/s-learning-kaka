import { useEffect, useRef, useState } from 'react';

interface DistortionImageProps {
  src: string;
  alt: string;
  className?: string;
  /** How far cursor influence reaches (px) */
  range?: number;
  /** Maximum displacement scale */
  maxStrength?: number;
}

/**
 * Image that warps/ripples toward the cursor as it approaches.
 * Uses SVG feDisplacementMap fed by a turbulence pattern; the scale
 * attribute is what gets animated based on cursor proximity.
 *
 * Each instance has a unique filter id so multiple images on a page
 * don't share displacement state.
 */
export default function DistortionImage({
  src,
  alt,
  className = '',
  range = 220,
  maxStrength = 28,
}: DistortionImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const [filterId] = useState(() => `distort-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;

    let frame = 0;
    let target = 0;
    let current = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      target = distance < range ? (1 - distance / range) * maxStrength : 0;
    };

    const tick = () => {
      // Lerp current toward target for smooth response
      current += (target - current) * 0.1;
      if (dispRef.current) {
        dispRef.current.setAttribute('scale', current.toFixed(2));
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, [range, maxStrength]);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ filter: `url(#${filterId})` }}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <img src={src} alt={alt} className="block w-full h-full object-cover" loading="lazy" />
    </div>
  );
}
