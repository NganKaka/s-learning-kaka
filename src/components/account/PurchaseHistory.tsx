import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listMyOrders, type OrderWithCourse } from '../../lib/orders';
import { formatVnd } from '../../lib/courses';
import { Badge, type BadgeTone } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonLine } from '../ui/Skeleton';
import type { OrderStatus } from '../../lib/database.types';

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  cancelled: { label: 'Đã huỷ', tone: 'neutral' },
  refunded: { label: 'Hoàn tiền', tone: 'neutral' },
};

/** The signed-in user's order history (course purchases + wallet top-ups). */
export default function PurchaseHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithCourse[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyOrders(user.id).then((rows) => {
      if (!cancelled) setOrders(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
        Lịch sử giao dịch
      </p>

      {orders === null ? (
        <div className="space-y-2">
          <SkeletonLine width="100%" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="90%" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<Receipt size={28} />} title="Chưa có giao dịch nào" />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const status = STATUS[o.status] ?? STATUS.pending;
            const title = o.kind === 'topup' ? 'Nạp ví' : (o.course?.title ?? 'Khoá học');
            const date = new Date(o.created_at).toLocaleDateString('vi-VN');
            return (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-on-surface truncate">{title}</p>
                  <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/50 tabular-nums">
                    {date} · {o.memo_code}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-headline font-bold text-on-surface tabular-nums text-sm">
                    {formatVnd(o.amount_vnd)}
                  </span>
                  <Badge tone={status.tone} size="sm">
                    {status.label}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
