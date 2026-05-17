import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, DollarSign, Users, Clock as ClockIcon } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatVnd } from '../lib/courses';

interface PendingRow {
  id: string;
  amount_vnd: number;
  memo_code: string;
  payment_method: string;
  kind: 'purchase' | 'topup';
  created_at: string;
  user_id: string;
  course_id: string | null;
  user_email?: string | null;
  user_display_name?: string | null;
  course_title?: string | null;
  notes?: string | null;
}

export default function TeacherSales() {
  const { user, profile, loading } = useAuth();
  const [orders, setOrders] = useState<PendingRow[] | null>(null);
  const [stats, setStats] = useState<{ pending: number; confirmedTotalVnd: number; activeStudents: number } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.is_instructor) return;
    let cancelled = false;
    (async () => {
      setOrders(null);
      // Pending orders, joined with the auth metadata server-side via RPC
      // would be ideal — for MVP, fetch orders + course title + we'll show
      // user_id (admin can cross-ref in Supabase if needed).
      const { data: pending } = await supabase
        .from('orders')
        .select('id, amount_vnd, memo_code, payment_method, kind, created_at, user_id, course_id, notes, courses(title)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      const rows: PendingRow[] = (pending ?? []).map((p) => {
        const coursesField = (p as { courses?: { title?: string } | { title?: string }[] | null }).courses;
        const courseTitle = coursesField
          ? Array.isArray(coursesField)
            ? (coursesField[0]?.title ?? null)
            : (coursesField.title ?? null)
          : null;
        return {
          id: p.id as string,
          amount_vnd: p.amount_vnd as number,
          memo_code: p.memo_code as string,
          payment_method: p.payment_method as string,
          kind: ((p as { kind?: 'purchase' | 'topup' }).kind ?? 'purchase'),
          created_at: p.created_at as string,
          user_id: p.user_id as string,
          course_id: (p.course_id as string | null) ?? null,
          notes: (p as { notes?: string | null }).notes ?? null,
          course_title: courseTitle,
        };
      });

      setOrders(rows);

      // Stats: confirmed total VND, distinct active students
      const [{ data: confirmed }, { data: enrolled }] = await Promise.all([
        supabase.from('orders').select('amount_vnd').eq('status', 'confirmed'),
        supabase.from('enrollments').select('user_id', { count: 'exact', head: false }).eq('status', 'active'),
      ]);
      if (cancelled) return;

      const confirmedTotal = (confirmed ?? []).reduce((s, o) => s + (o.amount_vnd as number), 0);
      const distinctStudents = new Set((enrolled ?? []).map((e) => e.user_id as string)).size;

      setStats({ pending: rows.length, confirmedTotalVnd: confirmedTotal, activeStudents: distinctStudents });
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.is_instructor, refreshTick]);

  if (loading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
      </PageShell>
    );
  }

  if (!user) return <Navigate to="/login?next=/teacher" replace />;
  if (!profile?.is_instructor) {
    return (
      <PageShell>
        <SectionHeading eyebrow="Teacher" title="Truy cập bị từ chối" />
        <div className="mt-6 glass-card rounded-2xl p-8 text-center">
          <p className="text-secondary/80">Tài khoản này không có quyền giảng viên.</p>
        </div>
      </PageShell>
    );
  }

  const handleApprove = async (orderId: string) => {
    setBusyOrderId(orderId);
    setErr(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setErr('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
      setBusyOrderId(null);
      return;
    }
    try {
      const res = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error ?? `Lỗi ${res.status}`);
      } else {
        setRefreshTick((n) => n + 1);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Teacher"
        title="Quản lý doanh thu"
        subtitle="Đối soát chuyển khoản, duyệt đơn hàng, và theo dõi mục tiêu doanh thu."
      />

      {/* Stats grid */}
      {stats && (
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Doanh thu đã xác nhận" value={formatVnd(stats.confirmedTotalVnd)} accent="gold" />
          <StatCard icon={ClockIcon} label="Đơn chờ duyệt" value={String(stats.pending)} accent="cyan" />
          <StatCard icon={Users} label="Học viên đang học" value={String(stats.activeStudents)} accent="cyan" />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Đơn hàng chờ duyệt</p>
        <button
          type="button"
          onClick={() => setRefreshTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/70 hover:border-cyan-300/40 hover:text-cyan-200 transition-colors"
        >
          <RefreshCw size={12} /> Tải lại
        </button>
      </div>

      {err && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {orders === null && (
          <div className="glass-card rounded-2xl p-8 animate-pulse h-32" />
        )}

        {orders && orders.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-secondary/70">Hiện không có đơn hàng nào cần duyệt.</p>
          </div>
        )}

        {orders?.map((order) => {
          const receiptUrl = extractReceiptUrl(order.notes);
          return (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 grid md:grid-cols-[1fr_auto] gap-4 items-start"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary tabular-nums">
                  {order.memo_code}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.16em] ${
                  order.kind === 'topup'
                    ? 'border border-cyan-300/40 bg-cyan-400/10 text-cyan-200'
                    : 'border border-primary/30 bg-primary/10 text-primary'
                }`}>
                  {order.kind === 'topup' ? 'Nạp tiền' : 'Mua khoá học'}
                </span>
                <span className="font-headline font-bold text-on-surface truncate">
                  {order.kind === 'topup' ? 'Nạp số dư' : (order.course_title ?? order.course_id ?? '—')}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                <span>{methodLabel(order.payment_method)}</span>
                <span>·</span>
                <span className="tabular-nums text-primary/85">{formatVnd(order.amount_vnd)}</span>
                <span>·</span>
                <span className="text-secondary/45">{formatDate(order.created_at)}</span>
              </div>
              <p className="text-xs text-secondary/50 truncate">User: {order.user_id}</p>
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block"
                >
                  <img
                    src={receiptUrl}
                    alt="Ảnh chuyển khoản"
                    className="max-h-32 rounded-lg border border-white/10 hover:border-cyan-300/40 transition-colors"
                  />
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleApprove(order.id)}
              disabled={busyOrderId === order.id}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-5 py-3 font-tech text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25 hover:shadow-[0_0_18px_rgba(233,195,73,0.32)] transition-all disabled:opacity-60"
            >
              {busyOrderId === order.id ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Đang duyệt…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Duyệt
                </>
              )}
            </button>
          </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}

function extractReceiptUrl(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/\[receipt\]\s+(\S+)/);
  return match?.[1] ?? null;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; accent: 'gold' | 'cyan' }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <p className={`font-headline text-2xl font-extrabold tabular-nums ${accent === 'gold' ? 'text-primary' : 'text-cyan-200'}`}>
        {value}
      </p>
    </div>
  );
}

function methodLabel(method: string): string {
  if (method === 'vietqr_vcb') return 'Vietcombank';
  if (method === 'vietqr_momo') return 'MoMo';
  if (method === 'free') return 'Miễn phí';
  return 'Thủ công';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
