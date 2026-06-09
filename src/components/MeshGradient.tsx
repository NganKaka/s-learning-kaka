interface MeshGradientProps {
  className?: string;
}

/**
 * Animated mesh gradient using two CSS-keyframe-driven blobs.
 * Pure compositor — no framer-motion subscription, no JS per frame.
 * Skips entirely under prefers-reduced-motion via the keyframes opting out.
 */
export default function MeshGradient({ className = '' }: MeshGradientProps) {
  return (
    /* hidden on phones (<sm) — blobs are large vw units and drain GPU on low-end devices;
       on desktop (sm+) they render exactly as before. */
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none hidden sm:block ${className}`}
    >
      <div
        className="mesh-blob absolute top-[10%] left-[10%] w-[60vw] h-[60vw] rounded-full blur-[80px] opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(233, 195, 73, 0.4), transparent 60%)',
          animation: 'mesh-drift-a 25s ease-in-out infinite',
        }}
      />
      <div
        className="mesh-blob absolute top-[40%] right-[10%] w-[50vw] h-[50vw] rounded-full blur-[80px] opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.35), transparent 60%)',
          animation: 'mesh-drift-b 30s ease-in-out infinite',
        }}
      />
    </div>
  );
}
