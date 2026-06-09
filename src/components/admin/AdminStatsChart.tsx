import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatVnd } from '../../lib/courses';
import type { DailyPoint } from '../../lib/adminStats';

/** Series config: dataKey, label, color, and which Y axis it belongs to. */
const SERIES = [
  { key: 'revenue', name: 'Doanh thu', color: '#e9c349', axis: 'vnd' },
  { key: 'signups', name: 'Đăng ký mới', color: '#67e8f9', axis: 'count' },
  { key: 'enrollments', name: 'Ghi danh', color: '#34d399', axis: 'count' },
  { key: 'passRate', name: 'Tỉ lệ đậu', color: '#fbbf24', axis: 'count' },
] as const;

const axisTick = { fontSize: 10, fill: 'rgba(255,255,255,0.5)' };
const axisLine = { stroke: 'rgba(255,255,255,0.1)' };

function formatValue(key: string, value: number): string {
  if (key === 'revenue') return formatVnd(value);
  if (key === 'passRate') return `${value.toFixed(0)}%`;
  return String(value);
}

/**
 * Combined 30-day statistics chart. Counts + pass-rate share the left axis;
 * revenue (much larger magnitude) uses the right axis. Click a legend entry to
 * toggle that series — useful for focusing on a single metric.
 */
export default function AdminStatsChart({ data }: { data: DailyPoint[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} interval="preserveStartEnd" />
          <YAxis yAxisId="count" tick={axisTick} axisLine={axisLine} width={36} />
          <YAxis
            yAxisId="vnd"
            orientation="right"
            tick={axisTick}
            axisLine={axisLine}
            width={48}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}K`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(103,232,249,0.3)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const key = String((item as { dataKey?: unknown })?.dataKey ?? '');
              const num = typeof value === 'number' ? value : Number(value);
              return [
                Number.isNaN(num) ? '—' : formatValue(key, num),
                SERIES.find((s) => s.key === key)?.name ?? key,
              ];
            }}
          />
          <Legend
            onClick={(e) => toggle(String((e as { dataKey?: unknown }).dataKey))}
            wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              yAxisId={s.axis}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              hide={hidden.has(s.key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
