interface MarqueeItem {
  label: string;
  icon?: string;
}

interface MarqueeProps {
  items: (string | MarqueeItem)[];
  speed?: number;
  direction?: 'left' | 'right';
  className?: string;
  separator?: string;
  showLogos?: boolean;
  variant?: 'display' | 'subtle';
}

/**
 * Pure CSS marquee. Animation runs entirely on the compositor — no
 * framer-motion subscription, no per-frame JS work. The track is rendered
 * three times so a -33.333% translation produces a seamless loop.
 */
export default function Marquee({
  items,
  speed = 30,
  direction = 'left',
  className = '',
  separator = '·',
  showLogos = false,
  variant = 'display',
}: MarqueeProps) {
  const normalized: MarqueeItem[] = items.map((item) =>
    typeof item === 'string' ? { label: item } : item,
  );
  const duplicatedItems = [...normalized, ...normalized, ...normalized];

  return (
    <div
      className={`relative overflow-hidden py-8 ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        minHeight: '110px',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          gap: variant === 'subtle' ? '2.5rem' : '4rem',
          whiteSpace: 'nowrap',
          alignItems: 'center',
          willChange: 'transform',
          animation: `${direction === 'left' ? 'marquee-left' : 'marquee-right'} ${speed}s linear infinite`,
        }}
      >
        {duplicatedItems.flatMap((item, index) => {
          const word = (
            <div
              key={`item-${index}`}
              style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              className="group"
            >
              {showLogos && item.icon ? (
                <img
                  src={item.icon}
                  alt={item.label}
                  title={item.label}
                  style={{ width: '70px', height: '70px', objectFit: 'contain', opacity: 0.7 }}
                  className="transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              ) : (
                <span
                  className={`font-headline tracking-tight transition-colors ${
                    variant === 'subtle'
                      ? 'italic text-2xl md:text-4xl font-light text-on-surface/40 hover:text-primary'
                      : 'text-3xl md:text-5xl font-black text-on-surface/30 hover:text-primary'
                  }`}
                >
                  {item.label}
                </span>
              )}
            </div>
          );

          const sep =
            separator && separator !== '' ? (
              <span
                key={`sep-${index}`}
                style={{ flexShrink: 0 }}
                className={`font-black opacity-50 ${
                  variant === 'subtle'
                    ? 'text-2xl md:text-4xl text-primary/60'
                    : 'text-3xl md:text-5xl text-primary'
                }`}
              >
                {separator}
              </span>
            ) : null;

          return sep ? [word, sep] : [word];
        })}
      </div>
    </div>
  );
}
