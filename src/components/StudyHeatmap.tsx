import { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { getStudySessions, aggregateByDate } from '../lib/studyTime';

export default function StudyHeatmap({ userId }: { userId: string }) {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [totalWeek, setTotalWeek] = useState(0);

  useEffect(() => {
    getStudySessions(userId, 84).then((sessions) => {
      const agg = aggregateByDate(sessions);
      setData(agg);
      // This week total
      const monday = getMonday();
      let weekTotal = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        weekTotal += agg[key] ?? 0;
      }
      setTotalWeek(weekTotal);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  // Generate 12 weeks (84 days) of cells
  const cells: { date: string; minutes: number }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, minutes: Math.round((data[key] ?? 0) / 60) });
  }

  const maxMinutes = Math.max(1, ...cells.map((c) => c.minutes));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-200">
          <Clock size={12} /> Thời gian học
        </p>
        <p className="font-tech text-[10px] tabular-nums text-secondary/55">
          Tuần này: <span className="text-cyan-200">{Math.round(totalWeek / 60)} phút</span>
        </p>
      </div>

      <div className="grid grid-cols-12 gap-[3px]">
        {cells.map((cell) => {
          const intensity = cell.minutes > 0 ? Math.max(0.15, cell.minutes / maxMinutes) : 0;
          return (
            <div
              key={cell.date}
              className="aspect-square rounded-sm"
              style={{ backgroundColor: intensity > 0 ? `rgba(103, 232, 249, ${intensity})` : 'rgba(255,255,255,0.04)' }}
              title={`${cell.date}: ${cell.minutes} phút`}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span className="font-tech text-[8px] text-secondary/45">Ít</span>
        {[0.15, 0.35, 0.6, 0.85].map((op) => (
          <div key={op} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(103, 232, 249, ${op})` }} />
        ))}
        <span className="font-tech text-[8px] text-secondary/45">Nhiều</span>
      </div>
    </div>
  );
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}
