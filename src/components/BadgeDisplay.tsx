import { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { type Badge, BADGE_DEFINITIONS, getUserBadges } from '../lib/badges';

export default function BadgeDisplay({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserBadges(userId).then((b) => { setBadges(b); setLoading(false); });
  }, [userId]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  const allKeys = Object.keys(BADGE_DEFINITIONS);
  const earnedKeys = new Set(badges.map((b) => b.badge_key));

  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-amber-300">
        <Award size={12} /> Huy hiệu ({badges.length}/{allKeys.length})
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {allKeys.map((key) => {
          const def = BADGE_DEFINITIONS[key];
          const earned = earnedKeys.has(key);
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 text-center transition-all ${
                earned ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/8 bg-white/[0.02] opacity-40'
              }`}
              title={def.description}
            >
              <p className="text-2xl">{def.icon}</p>
              <p className="font-tech text-[8px] uppercase tracking-[0.12em] text-secondary/70 mt-1 leading-tight">
                {def.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
