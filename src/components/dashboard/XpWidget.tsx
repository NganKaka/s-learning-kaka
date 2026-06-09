/**
 * XP Widget — shows level, total XP, daily XP, and a progress bar toward next level.
 */
import { useEffect, useState } from 'react';
import { Loader2, Zap, Trophy } from 'lucide-react';
import { getXpStats } from '../../lib/xp';

interface XpData {
  total: number;
  streak: number;
  todayXp: number;
}

function getLevel(totalXp: number): {
  level: number;
  current: number;
  required: number;
  pct: number;
} {
  // Every level needs level * 100 XP
  let level = 1;
  let required = 100;
  let cumulative = 0;
  while (totalXp >= cumulative + required) {
    cumulative += required;
    level += 1;
    required = level * 100;
  }
  const current = totalXp - cumulative;
  const pct = Math.round((current / required) * 100);
  return { level, current, required, pct };
}

const LEVEL_REWARDS: Record<string, string> = {
  1: 'Bắt đầu cuộc hành trình',
  5: 'Nắm vững kiến thức cơ bản',
  10: 'Học viên chăm chỉ',
  15: 'Ngôi sao đang lên',
  20: 'Bậc thầy Toán học',
};

function getLevelTitle(level: number): string {
  return LEVEL_REWARDS[level] ?? `Cấp ${level}`;
}

export default function XpWidget({ userId }: { userId: string }) {
  const [xp, setXp] = useState<XpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getXpStats(userId).then((data) => {
      setXp(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!xp) return null;

  const { level, current, required, pct } = getLevel(xp.total);
  const nextMilestone = Object.keys(LEVEL_REWARDS)
    .map(Number)
    .filter((l) => l > level)
    .sort((a, b) => a - b)[0];
  const toNextMilestone = nextMilestone ? nextMilestone * 500 - xp.total : null;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-300" />
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-amber-300">
            Cấp {level}
          </span>
        </div>
        <span className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">
          {getLevelTitle(level)}
        </span>
      </div>

      {/* XP bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between font-tech text-[9px] text-secondary/55 uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1">
            <Zap size={9} className="text-primary" />
            {current.toLocaleString()} / {required.toLocaleString()} XP
          </span>
          <span className="tabular-nums text-primary">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 transition-all duration-700 ease-out relative"
            style={{ width: `${pct}%` }}
          >
            {pct > 5 && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40 rounded-r-full" />
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Zap size={11} className="text-primary" />
            <span className="font-headline text-sm font-extrabold tabular-nums text-primary">
              {xp.todayXp}
            </span>
            <span className="font-tech text-[9px] uppercase text-secondary/55">hôm nay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy size={11} className="text-amber-300" />
            <span className="font-headline text-sm font-extrabold tabular-nums text-amber-300">
              {xp.total.toLocaleString()}
            </span>
            <span className="font-tech text-[9px] uppercase text-secondary/55">tổng</span>
          </div>
        </div>
        {toNextMilestone !== null && (
          <span className="font-tech text-[9px] text-secondary/45 text-right leading-tight">
            Còn {toNextMilestone.toLocaleString()} XP
            <br />
            đến cấp {nextMilestone}
          </span>
        )}
      </div>
    </div>
  );
}
