import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, BookOpen, Wallet } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatVnd } from '../lib/courses';

type Range = '1d' | '7d' | '30d' | 'all';

const RANGES: Array<{ id: Range; label: string }> = [
  { id: '1d', label: '24 giờ' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: 'all', label: 'Tất cả' },
];

interface ConfirmedOrder {
  id: string;
  amount_vnd: number;
  kind: 'purchase' | 'topup';
  payment_method: string;
  memo_code: string;
  confirmed_at: string;
  user_id: string;
  course_id: string | null;
  course_title: string | null;
}

export default function TeacherRevenue() {
  const { profile } = useAuth();
  const [range, setRange] = useState<Range>('7d');
  const [orders, setOrders] = useState<ConfirmedOrder[] | null>(null);

  useEffect(() => {
    if (!profile?.is_instructor) return;
    let cancelled = false;
    (async () => {
      setOrders(null);
      let q = supabase
        .from('orders')
        .select('id, amount_vnd, kind, payment_method, memo_code, confirmed_at, user_id, course_id, courses(title)')
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false });

      if (range !== 'all') {
        const since = new Date();
        if (range === '1d') since.setDate(since.getDate() - 1);
        else if (range === '7d') since.setDate(since.getDate() - 7);
        else if (range === '30d') since.setDate(since.getDate() - 30);
        q = q.gte('confirmed_at', since.toISOString());
      }

      const { data } = await q;
      if (cancelled) return;
      const rows: ConfirmedOrder[] = (data ?? []).map((row) => {
        const cf = (row as { courses?: { title?: string } | { title?: string }[] | null }).courses;
        const course_title = cf
          ? Array.isArray(cf)
            ? (cf[0]?.title ?? null)
            : (cf.title ?? null)
          : null;
        return {
          id: row.id as string,
          amount_vnd: row.amount_vnd as number,
          kind: ((row as { kind?: 'purchase' | 'topup' }).kind ?? 'purchase'),
          payment_method: row.payment_method as string,
          memo_code: row.memo_code as string,
          confirmed_at: row.confirmed_at as string,
          user_id: row.user_id as string,
          course_id: (row.course_id as string | null) ?? null,
          course_title,
        };
      });
      setOrders(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.is_instructor, range]);

  const stats = useMemo(() => {
    if (!orders) return null;
    const purchases = orders.filter((o) => o.kind === 'purchase');
    const topups = orders.filter((o) => o.kind === 'topup');
    return {
      total: orders.reduce((s, o) => s + o.amount_vnd, 0),
      purchaseTotal: purchases.reduce((s, o) => s + o.amount_vnd, 0),
      topupTotal: topups.reduce((s, o) => s + o.amount_vnd, 0),
      orderCount: orders.length,
      purchaseCount: purchases.length,
      topupCount: topups.length,
    };
  }, [orders]);

  // Group by day for the bar chart (only meaningful for 7d/30d)
  const dailyTotals = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const map = new Map<string, number>();
    for (const o of orders) {
      const day = (o.confirmed_at ?? '').slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + o.amount_vnd);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, total]) => ({ day, total }));
  }, [orders]);

  const peak = useMemo(() => {
    return dailyTotals.reduce((m, d) => Math.max(m, d.total), 0);
  }, [dailyTotals]);

  if (!profile?.is_instructor) return <Navigate to="/teacher" replace />;

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Teacher · Revenue"
        title="Lịch sử doanh thu"
        subtitle="Theo dõi doanh thu đã xác nhận theo ngày, lọc theo khoảng thời gian."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-tech uppercase tracking-[0.14em] transition-all ${
              range === r.id
                ? 'border border-primary/40 bg-primary/15 text-primary'
                : 'border border-white/10 bg-white/[0.03] text-secondary/70 hover:border-cyan-300/30 hover:text-cyan-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Card icon={Wallet} label="Tổng doanh thu" value={formatVnd(stats.total)} tone="gold" sub={`${stats.orderCount} đơn`} />
          <Card icon={BookOpen} label="Bán khoá học" value={formatVnd(stats.purchaseTotal)} tone="cyan" sub={`${stats.purchaseCount} đơn`} />
          <Card icon={TrendingUp} label="Nạp tiền" value={formatVnd(stats.topupTotal)} tone="cyan" sub={`${stats.topupCount} đơn`} />
        </div>
      )}

      {/* Daily bar chart */}
      {dailyTotals.length > 0 && (
        <div className="mt-8 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary inline-flex items-center gap-2">
              <Calendar size={12} /> Theo ngày
            </p>
            <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55 tabular-nums">
              Đỉnh: {formatVnd(peak)}
            </p>
          </div>
          <div className="flex items-end gap-1.5 h-40">
            {dailyTotals.map((d) => {
              const heightPct = peak > 0 ? (d.total / peak) * 100 : 0;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={`${d.day}: ${formatVnd(d.total)}`}>
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full rounded-t bg-gradient-to-t from-primary/40 via-primary/70 to-primary"
                      style={{ minHeight: d.total > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="font-tech text-[8px] uppercase tracking-[0.12em] text-secondary/45 tabular-nums truncate w-full text-center">
                    {d.day.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order list */}
      <div className="mt-8 space-y-3">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Đơn đã xác nhận</p>

        {orders === null && (
          <div className="glass-card rounded-2xl p-12 animate-pulse h-32" />
        )}

        {orders && orders.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-secondary/65">Chưa có đơn nào trong khoảng thời gian này.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.16em] shrink-0 ${
                    o.kind === 'topup'
                      ? 'border border-cyan-300/40 bg-cyan-400/10 text-cyan-200'
                      : 'border border-primary/30 bg-primary/10 text-primary'
                  }`}>
                    {o.kind === 'topup' ? 'Nạp' : 'Khoá'}
                  </span>
                  <span className="font-tech text-[10px] uppercase tracking-[0.16em] text-primary tabular-nums shrink-0">{o.memo_code}</span>
                  <span className="text-sm text-on-surface truncate">{o.kind === 'topup' ? 'Nạp số dư' : (o.course_title ?? '—')}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-headline font-bold text-primary tabular-nums">{formatVnd(o.amount_vnd)}</span>
                  <span className="font-tech text-[10px] tabular-nums text-secondary/55">{formatDate(o.confirmed_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Card({ icon: Icon, label, value, tone, sub }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; tone: 'gold' | 'cyan'; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <p className={`font-headline text-2xl font-extrabold tabular-nums ${tone === 'gold' ? 'text-primary' : 'text-cyan-200'}`}>
        {value}
      </p>
      {sub && <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/45">{sub}</p>}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
