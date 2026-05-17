import { ReactNode, useState } from 'react';

interface GlitchTextProps {
  children: ReactNode;
  className?: string;
  /** Active continuously (true) or only on hover (false). Default false. */
  always?: boolean;
}

/**
 * Wraps text content and renders 3 stacked copies (red, green, blue) that
 * twitch out of alignment on hover and snap back to center when not.
 *
 * The twitch is pure CSS keyframes - no JS per-frame work. The colored
 * layers use mix-blend-mode: screen so they additively combine to white
 * when aligned, then bleed apart into RGB channels when offset.
 */
export default function GlitchText({ children, className = '', always = false }: GlitchTextProps) {
  const [hovered, setHovered] = useState(false);
  const active = always || hovered;

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="relative z-10">{children}</span>

      {/* Red channel */}
      <span
        aria-hidden
        className={`absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-150 ${
          active ? 'opacity-90 glitch-anim-r' : 'opacity-0'
        }`}
        style={{ color: '#ff003c' }}
      >
        {children}
      </span>

      {/* Green channel */}
      <span
        aria-hidden
        className={`absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-150 ${
          active ? 'opacity-90 glitch-anim-g' : 'opacity-0'
        }`}
        style={{ color: '#00ffae' }}
      >
        {children}
      </span>

      {/* Blue channel */}
      <span
        aria-hidden
        className={`absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-150 ${
          active ? 'opacity-90 glitch-anim-b' : 'opacity-0'
        }`}
        style={{ color: '#00bcff' }}
      >
        {children}
      </span>
    </span>
  );
}