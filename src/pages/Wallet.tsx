import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, ArrowDownToLine, ArrowUpFromLine, Loader2, Copy, Check, AlertCircle, Landmark, HeartHandshake, Upload, Image as ImageIcon, X } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { useWalletBalance, useWalletTransactions } from '../lib/wallet';
import { createOrder, useOrderStatus, buildVietQrImageUrl, getBankInfo } from '../lib/orders';
import { formatVnd } from '../lib/courses';
import ReceiptUpload from '../components/ReceiptUpload';

const PRESETS = [100_000, 200_000, 500_000, 1_000_000];

type Step = 'amount' | 'pay' | 'submitted';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const balance = useWalletBalance();
  const [refreshKey, setRefreshKey] = useState(0);
  const transactions = useWalletTransactions(refreshKey);

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number>(200_000);
  const [bank, setBank] = useState<'vcb' | 'momo'>('vcb');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const order = useOrderStatus(orderId);

  useEffect(() => {
    if (order?.status === 'confirmed') {
      const t = window.setTimeout(() => {
        setStep('amount');
        setOrderId(null);
        setRefreshKey((n) => n + 1);
      }, 2000);
      return () => window.clearTimeout(t);
    }
  }, [order?.status]);

  if (!authLoading && !user) return <Navigate to="/login?next=/wallet" replace />;
  if (authLoading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
      </PageShell>
    );
  }

  const handleStartTopup = async () => {
    if (amount < 10_000) {
      setErrorMsg('Tối thiểu 10.000 ₫.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const result = await createOrder({
      kind: 'topup',
      amountVnd: amount,
      paymentMethod: bank === 'vcb' ? 'vietqr_vcb' : 'vietqr_momo',
    });
    setSubmitting(false);
    if (result.error || !result.order) {
      setErrorMsg(result.error ?? 'Không tạo được đơn nạp tiền.');
      return;
    }
    setOrderId(result.order.id);
    setStep('pay');
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Wallet"
        title="Số dư & Nạp tiền"
        subtitle="Nạp tiền vào tài khoản để mua khoá học ngay không cần chờ duyệt."
      />

      <div className="mt-8 grid lg:grid-cols-[1fr_420px] gap-8">
        {/* Left: top-up flow */}
        <div className="space-y-6">
          {step === 'amount' && (
            <AmountPanel
              amount={amount}
              setAmount={setAmount}
              bank={bank}
              setBank={setBank}
              submitting={submitting}
              errorMsg={errorMsg}
              onContinue={handleStartTopup}
            />
          )}

          {step === 'pay' && order && (
            <PayPanel
              bank={bank}
              order={order}
              onSubmitted={() => setStep('submitted')}
            />
          )}

          {step === 'submitted' && order && (
            <SubmittedPanel order={order} />
          )}

          {/* Transaction history */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Lịch sử giao dịch</p>
            {transactions === null && <div className="h-32 animate-pulse bg-white/[0.03] rounded-lg" />}
            {transactions && transactions.length === 0 && (
              <p className="text-sm text-secondary/60 text-center py-6">Chưa có giao dịch nào.</p>
            )}
            {transactions && transactions.length > 0 && (
              <ul className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <li key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border shrink-0 ${
                          tx.amount_vnd > 0
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-400/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {tx.amount_vnd > 0 ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-on-surface truncate">{kindLabel(tx.kind)}</p>
                        {tx.memo && <p className="text-xs text-secondary/60 truncate">{tx.memo}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-headline font-bold tabular-nums ${tx.amount_vnd > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {tx.amount_vnd > 0 ? '+' : ''}
                        {formatVnd(tx.amount_vnd)}
                      </p>
                      <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/45">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: balance card */}
        <aside className="lg:sticky lg:top-28 lg:self-start space-y-3">
          <div className="glass-card rounded-3xl p-6 ambient-shadow space-y-3">
            <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-secondary/55">
              <Wallet size={12} className="text-primary" />
              <span>Số dư hiện tại</span>
            </div>
            <p className="font-headline text-4xl font-extrabold text-primary tabular-nums">
              {balance !== null ? formatVnd(balance) : '...'}
            </p>
            <p className="text-xs text-secondary/55">
              Có thể dùng số dư để mua khoá học ngay lập tức, không cần chờ duyệt.
            </p>
            <Link
              to="/courses"
              className="block text-center text-xs font-tech uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200 underline pt-2"
            >
              Duyệt khoá học →
            </Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function AmountPanel({ amount, setAmount, bank, setBank, submitting, errorMsg, onContinue }: { amount: number; setAmount: (n: number) => void; bank: 'vcb' | 'momo'; setBank: (b: 'vcb' | 'momo') => void; submitting: boolean; errorMsg: string | null; onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl p-6 md:p-8 space-y-5"
    >
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Bước 1 — Số tiền nạp</p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-xl border px-3 py-2.5 font-headline text-sm font-bold tabular-nums transition-all ${
                amount === p
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-white/10 bg-white/[0.03] text-secondary hover:border-cyan-300/30'
              }`}
            >
              {formatVnd(p)}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="number"
            min={10000}
            step={10000}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-14 text-base text-on-surface tabular-nums focus:border-cyan-300/50 focus:outline-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/55 font-tech text-xs">VND</span>
        </div>
      </div>

      <div>
        <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55 mb-2">Phương thức</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <BankOption icon={Landmark} name="Vietcombank" subtitle="Chuyển khoản (VietQR)" active={bank === 'vcb'} onClick={() => setBank('vcb')} />
          <BankOption icon={HeartHandshake} name="MoMo" subtitle="Ví điện tử" active={bank === 'momo'} onClick={() => setBank('momo')} />
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        disabled={submitting || amount < 10000}
        onClick={onContinue}
        className="w-full bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 size={14} className="animate-spin" /> Đang tạo đơn...</> : <><Plus size={14} /> Nạp {formatVnd(amount)}</>}
      </button>
    </motion.div>
  );
}

function BankOption({ icon: Icon, name, subtitle, active, onClick }: { icon: React.ComponentType<{ size?: number }>; name: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-4 py-3 transition-all ${
        active
          ? 'border-primary/50 bg-primary/10 shadow-[0_0_18px_rgba(233,195,73,0.2)]'
          : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30 hover:bg-cyan-400/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-white/[0.05] text-cyan-300 border border-white/10'}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="font-headline font-bold text-on-surface text-sm">{name}</p>
          <p className="text-xs text-secondary/60">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function PayPanel({ bank, order, onSubmitted }: { bank: 'vcb' | 'momo'; order: { id: string; memo_code: string; amount_vnd: number }; onSubmitted: () => void }) {
  const info = getBankInfo(bank);
  const qrUrl = useMemo(
    () => buildVietQrImageUrl({ bank, amountVnd: order.amount_vnd, memo: order.memo_code }),
    [bank, order.amount_vnd, order.memo_code],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Bước 2 — Chuyển khoản</p>

        <div className="grid md:grid-cols-[200px_1fr] gap-5 items-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {qrUrl ? (
              <img src={qrUrl} alt="VietQR" className="w-full aspect-square rounded-lg object-contain bg-white" />
            ) : (
              <div className="aspect-square rounded-lg bg-white/[0.05] flex items-center justify-center text-xs text-secondary/55 text-center px-4">
                MoMo không hỗ trợ VietQR — chuyển khoản thủ công theo thông tin bên phải.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Row label="Ngân hàng" value={info.bankName} />
            <Row label="Số tài khoản" value={info.account} copyable />
            <Row label="Tên TK" value={info.name} />
            <Row label="Số tiền" value={formatVnd(order.amount_vnd)} />
            <Row label="Nội dung" value={order.memo_code} copyable highlight />
          </div>
        </div>

        <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.04] p-4 text-sm text-cyan-100/85">
          <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200 mb-1">Quan trọng</p>
          Nội dung chuyển khoản phải đúng <strong className="text-cyan-200 font-tech">{order.memo_code}</strong>.
        </div>
      </div>

      <ReceiptUpload orderId={order.id} />

      <button
        type="button"
        onClick={onSubmitted}
        className="w-full bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow inline-flex items-center justify-center gap-2"
      >
        <Check size={14} /> Tôi đã chuyển khoản
      </button>
    </motion.div>
  );
}

function Row({ label, value, copyable, highlight }: { label: string; value: string; copyable?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${highlight ? 'border-primary/30 bg-primary/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="min-w-0">
        <p className="font-tech text-[9px] uppercase tracking-[0.18em] text-secondary/55">{label}</p>
        <p className={`mt-0.5 font-tech tabular-nums truncate ${highlight ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:border-cyan-300/40 hover:bg-cyan-400/10 text-secondary hover:text-cyan-200 transition-colors"
          aria-label="Sao chép"
        >
          {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}

function SubmittedPanel({ order }: { order: { status: string } }) {
  const isConfirmed = order.status === 'confirmed';
  return (
    <AnimatePresence mode="wait">
      <motion.div key={order.status} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 md:p-10 text-center space-y-3">
        {isConfirmed ? (
          <>
            <Check size={36} className="text-primary mx-auto" />
            <p className="font-headline text-xl font-bold text-on-surface">Đã nạp tiền thành công!</p>
            <p className="text-sm text-secondary/80">Số dư đã được cập nhật.</p>
          </>
        ) : (
          <>
            <Loader2 size={28} className="text-cyan-300 mx-auto animate-spin" />
            <p className="font-headline text-xl font-bold text-on-surface">Đang chờ duyệt</p>
            <p className="text-sm text-secondary/80">Giảng viên sẽ cộng tiền trong vòng 24h.</p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function kindLabel(kind: string): string {
  if (kind === 'topup') return 'Nạp tiền';
  if (kind === 'purchase') return 'Mua khoá học';
  if (kind === 'refund') return 'Hoàn tiền';
  return 'Điều chỉnh';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
