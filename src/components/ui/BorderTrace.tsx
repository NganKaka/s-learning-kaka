import { ReactNode } from 'react';

interface BorderTraceProps {
  children: ReactNode;
  className?: string;
  rounded?: number;
  color?: string;
}

/**
 * Wraps content with an SVG outline that "draws" around the perimeter
 * on hover via stroke-dashoffset. Works on top of any rounded rectangle.
 * The outline sits above the content but is pointer-events: none so it
 * doesn't block clicks.
 */
export default function BorderTrace({
  children,
  className = '',
  rounded = 16,
  color = 'rgba(34, 211, 238, 0.85)',
}: BorderTraceProps) {
  return (
    <div className={`relative group ${className}`}>
      {children}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={rounded}
          ry={rounded}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
          className="transition-[stroke-dashoffset] duration-700 ease-out group-hover:[stroke-dashoffset:0]"
          style={{ filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.5))' }}
        />
      </svg>
    </div>
  );
}
