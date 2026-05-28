export function SkeletonCard() {
  return <div className="glass-card rounded-2xl p-5 animate-pulse space-y-3"><div className="h-4 w-2/3 rounded bg-white/10" /><div className="h-3 w-1/2 rounded bg-white/[0.06]" /><div className="h-32 rounded-xl bg-white/[0.04]" /></div>;
}

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className="h-3 rounded bg-white/10 animate-pulse" style={{ width }} />;
}

export function SkeletonAvatar({ size = 32 }: { size?: number }) {
  return <div className="rounded-full bg-white/10 animate-pulse" style={{ width: size, height: size }} />;
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-3 flex-1 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
          <div className="h-3 w-12 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Lazy image with blur-up placeholder.
 */
export function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`transition-opacity duration-300 ${className ?? ''}`}
      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
      style={{ opacity: 0 }}
    />
  );
}
