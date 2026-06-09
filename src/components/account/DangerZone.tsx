import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

const CONFIRM_WORD = 'XOÁ';

/** Account deletion. Two gates: open the panel, then type the confirm word.
 *  Calls the token-verified /api/account/delete endpoint, then signs out. */
export default function DangerZone() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirm.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setBusy(false);
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setBusy(false);
        setError(body.error ?? 'Xoá tài khoản thất bại.');
        return;
      }
      await signOut();
      navigate('/');
    } catch {
      setBusy(false);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  return (
    <section className="rounded-2xl border border-red-400/30 bg-red-500/[0.03] p-6 space-y-3">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-red-300">
        <AlertTriangle size={12} aria-hidden="true" /> Vùng nguy hiểm
      </p>
      <p className="text-sm text-secondary/70">
        Xoá tài khoản sẽ gỡ bỏ vĩnh viễn hồ sơ, tiến độ học và dữ liệu của bạn. Hành động này không
        thể hoàn tác.
      </p>

      {!open ? (
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
          Xoá tài khoản
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="danger-confirm"
              className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55"
            >
              Nhập <span className="text-red-300">{CONFIRM_WORD}</span> để xác nhận
            </label>
            <input
              id="danger-confirm"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="w-full max-w-xs rounded-lg border border-red-400/30 bg-red-500/[0.04] px-3 py-2 text-sm text-on-surface focus:border-red-400/60 focus:outline-none"
            />
          </div>
          {error && <ErrorAlert message={error} />}
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              disabled={!canDelete}
              onClick={handleDelete}
            >
              Xoá vĩnh viễn
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setConfirm('');
                setError(null);
              }}
            >
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
