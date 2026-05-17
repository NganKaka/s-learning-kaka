/**
 * Full-screen subtle film grain. Pure SVG turbulence rendered once into a
 * fixed background. No JS animation; ~0 perf cost.
 */
export default function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] mix-blend-overlay opacity-[0.05]"
      style={{
        backgroundImage:
          // Inline SVG turbulence — small tile, repeated.
          // baseFrequency tuned so grain reads as photographic, not pixelated.
          `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        backgroundSize: '160px 160px',
      }}
    />
  );
}
