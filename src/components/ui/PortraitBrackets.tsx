/**
 * Four corner brackets drawn over the portrait card. Pure SVG with
 * stroke-dashoffset CSS animation — runs once on mount, ~700ms,
 * compositor-only, no JS per frame.
 */
export default function PortraitBrackets() {
  return (
    <svg
      aria-hidden
      className="portrait-brackets pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {/* Top-left */}
      <polyline points="2,18 2,2 18,2" className="bracket gold" />
      {/* Top-right */}
      <polyline points="82,2 98,2 98,18" className="bracket cyan" />
      {/* Bottom-right */}
      <polyline points="98,82 98,98 82,98" className="bracket gold" />
      {/* Bottom-left */}
      <polyline points="18,98 2,98 2,82" className="bracket cyan" />
    </svg>
  );
}
