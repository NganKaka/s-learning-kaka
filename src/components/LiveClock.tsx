import { useEffect, useState } from 'react';

/**
 * Tiny ticking clock for the navbar. Updates once per second,
 * shows local time + UTC offset. Defensively handles SSR.
 */
export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offsetH = Math.floor(Math.abs(offsetMin) / 60);
  const offsetMm = Math.abs(offsetMin) % 60;
  const offsetLabel = offsetMm === 0 ? `UTC${sign}${offsetH}` : `UTC${sign}${offsetH}:${String(offsetMm).padStart(2, '0')}`;

  return (
    <span
      className="hidden lg:inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55 select-none"
      aria-label={`Local time ${hh}:${mm}`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
      <span className="tabular-nums">{hh}:{mm}:{ss}</span>
      <span className="text-secondary/35">{offsetLabel}</span>
    </span>
  );
}
