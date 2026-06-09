import { Link } from 'react-router-dom';
import { Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatVnd } from '../../lib/courses';
import { Badge, type BadgeTone } from '../ui/Badge';

/** Read-only account facts: email, member-since, role badges, wallet balance. */
export default function AccountInfoPanel() {
  const { user, profile } = useAuth();

  const roles: Array<{ label: string; tone: BadgeTone }> = [];
  if (profile?.is_admin) roles.push({ label: 'Quản trị', tone: 'warning' });
  if (profile?.is_instructor) roles.push({ label: 'Giảng viên', tone: 'info' });
  if (profile?.is_parent) roles.push({ label: 'Phụ huynh', tone: 'success' });
  if (roles.length === 0) roles.push({ label: 'Học viên', tone: 'neutral' });

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Tài khoản</p>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-secondary/60">Email</dt>
          <dd className="text-on-surface truncate">{user?.email ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-secondary/60">Thành viên từ</dt>
          <dd className="text-on-surface tabular-nums">{joined}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-secondary/60">Vai trò</dt>
          <dd className="flex flex-wrap justify-end gap-1.5">
            {roles.map((r) => (
              <Badge key={r.label} tone={r.tone} size="sm">
                {r.label}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>

      <Link
        to="/wallet"
        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-cyan-300/30 transition-colors"
      >
        <span className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/60">
          <WalletIcon size={13} className="text-cyan-300" aria-hidden="true" /> Số dư ví
        </span>
        <span className="font-headline font-bold text-primary tabular-nums">
          {formatVnd(profile?.wallet_balance_vnd ?? 0)}
        </span>
      </Link>
    </section>
  );
}
