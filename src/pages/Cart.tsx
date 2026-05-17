import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Copy, Check, Landmark, HeartHandshake, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatVnd } from '../lib/courses';
import { createOrder, useOrderStatus, buildVietQrImageUrl, getBankInfo } from '../lib/orders';
import type { Course, PaymentMethod } from '../lib/database.types';

type Step = 'pick' | 'pay' | 'submitted';

export default function Cart() {
  const [searchParams] = useSearchParams();
  const courseSlug = searchParams.get('course');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('pick');
  const [bank, setBank] = useState<'vcb' | 'momo'>('vcb');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const order = useOrderStatus(orderId);

  useEffect(() => {
    if (!courseSlug) {
      setCourseLoading(false);
      setCourseError('missing_course');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .eq('status', 'published')
        .maybeSingle();
      if (cancelled) return;
      if (error) setCourseError(error.message);
      else if (!data) setCourseError('not_found');
      else setCourse(data as Course);
      setCourseLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  useEffect(() => {
    if (order?.status === 'confirmed' && course) {
      const t = window.setTimeout(() => navigate(`/courses/${course.slug}`), 1500);
      return () => window.clearTimeout(t);
    }
  }, [order?.status, course, navigate]);

  if (!authLoading && !user) {
    return <Navigate to={`/login?next=/cart${courseSlug ? `?course=${courseSlug}` : ''}`} replace />;
  }

  if (courseLoading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
      </PageShell>
    );
  }

  if (courseError || !course) {
    return (
      <PageShell>
        <SectionHeading eyebrow="Checkout" title="Không tìm thấy khoá học" />
        <div className="mt-6 glass-card rounded-2xl p-8 text-center">
          <p className="text-secondary/80">Vui lòng quay lại danh sách khoá học và chọn khoá bạn muốn đăng ký.</p>
          <Link to="/courses" className="inline-block mt-4 text-cyan-300 hover:text-cyan-200 underline">
            Xem khoá học
          </Link>
        </div>
      </PageShell>
    );
  }

  const handleContinue = async (method: PaymentMethod) => {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await createOrder({
      courseId: course.id,
      courseSlug: course.slug,
      amountVnd: course.price_vnd,
      paymentMethod: method,
    });
    setSubmitting(false);
    if (result.error || !result.order) {
      setErrorMsg(result.error ?? 'Không tạo được đơn hàng.');
      return;
    }
    setOrderId(result.order.id);
    setStep('pay');
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Checkout"
        title="Đăng ký khoá học"
        subtitle="Chuyển khoản qua VietQR — giảng viên sẽ duyệt và gửi email truy cập trong vòng 24h."
      />

      <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          {step === 'pick' && (
            <PickPayment bank={bank} onPickBank={setBank} amount={course.price_vnd} onContinue={handleContinue} submitting={submitting} errorMsg={errorMsg} />
          )}
          {step === 'pay' && order && (
            <PayPanel bank={bank} order={order} courseTitle={course.title} onSubmitted={() => setStep('submitted')} />
          )}
          {step === 'submitted' && order && (
            <SubmittedPanel order={order} />
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-card rounded-2xl p-6 ambient-shadow space-y-4">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-secondary/55">Đơn hàng</p>
            <div className="flex items-start gap-3">
              {course.cover_image && (
                <img src={course.cover_image} alt="" className="w-20 h-20 rounded-lg object-cover border border-white/10 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-headline font-bold text-on-surface truncate">{course.title}</p>
                <p className="text-xs text-secondary/65 truncate">{course.subtitle}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-secondary/70 text-sm">Tổng cộng</span>
              <span className="font-headline text-2xl font-extrabold text-primary tabular-nums">{formatVnd(course.price_vnd)}</span>
            </div>
            <p className="text-xs text-secondary/50">
              Sau khi giảng viên xác nhận thanh toán, bạn sẽ nhận email xác nhận và có thể bắt đầu học ngay.
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

interface PickPaymentProps {
  bank: 'vcb' | 'momo';
  onPickBank: (b: 'vcb' | 'momo') => void;
  amount: number;
  onContinue: (method: PaymentMethod) => void;
  submitting: boolean;
  errorMsg: string | null;
}

function PickPayment({ bank, onPickBank, amount, onContinue, submitting, errorMsg }: PickPaymentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card rounded-2xl p-6 md:p-8 space-y-5"
    >
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Chọn phương thức</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <BankOption
          icon={Landmark}
          name="Vietcombank"
          subtitle="Chuyển khoản ngân hàng (VietQR)"
          active={bank === 'vcb'}
          onClick={() => onPickBank('vcb')}
        />
        <BankOption
          icon={HeartHandshake}
          name="MoMo"
          subtitle="Chuyển khoản ví điện tử"
          active={bank === 'momo'}
          onClick={() => onPickBank('momo')}
        />
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => onContinue(bank === 'vcb' ? 'vietqr_vcb' : 'vietqr_momo')}
        className="w-full bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Đang tạo đơn hàng…
          </>
        ) : (
          <>
            Tiếp tục với {formatVnd(amount)} <ArrowRight size={14} />
          </>
        )}
      </button>
    </motion.div>
  );
}

function BankOption({ icon: Icon, name, subtitle, active, onClick }: { icon: React.ComponentType<{ size?: number }>; name: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-4 py-4 transition-all ${
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
          <p className="font-headline font-bold text-on-surface">{name}</p>
          <p className="text-xs text-secondary/60">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function PayPanel({ bank, order, courseTitle, onSubmitted }: { bank: 'vcb' | 'momo'; order: { id: string; memo_code: string; amount_vnd: number }; courseTitle: string; onSubmitted: () => void }) {
  const info = getBankInfo(bank);
  const qrUrl = useMemo(() => buildVietQrImageUrl({ bank, amountVnd: order.amount_vnd, memo: order.memo_code }), [bank, order.amount_vnd, order.memo_code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
        <div>
          <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Bước 1 — Quét QR hoặc nhập tay</p>
          <p className="mt-1 text-sm text-secondary/80">Mở app ngân hàng / ví, chuyển khoản với nội dung chính xác như bên dưới.</p>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {qrUrl ? (
              <img src={qrUrl} alt="VietQR" className="w-full aspect-square rounded-lg object-contain bg-white" />
            ) : (
              <div className="aspect-square rounded-lg bg-white/[0.05] flex items-center justify-center text-xs text-secondary/55 text-center px-4">
                MoMo không hỗ trợ VietQR — vui lòng chuyển khoản thủ công theo thông tin bên phải.
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
          Vui lòng chuyển khoản với nội dung <strong className="text-cyan-200 font-tech">{order.memo_code}</strong> để giảng viên có thể đối soát đơn hàng nhanh nhất.
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmitted}
        className="w-full bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow inline-flex items-center justify-center gap-2"
      >
        <Check size={14} /> Tôi đã chuyển khoản — chờ duyệt
      </button>

      <p className="text-xs text-secondary/55 text-center">
        Đơn hàng cho khoá <span className="text-secondary/80">{courseTitle}</span>. Bạn có thể đóng trang này — thay đổi sẽ tự cập nhật khi giảng viên duyệt.
      </p>
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
      <motion.div
        key={order.status}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="glass-card rounded-2xl p-8 md:p-10 text-center space-y-4"
      >
        {isConfirmed ? (
          <>
            <Check size={42} className="text-primary mx-auto" />
            <p className="font-headline text-xl font-bold text-on-surface">Đã xác nhận thanh toán!</p>
            <p className="text-sm text-secondary/80">Đang chuyển bạn đến khoá học…</p>
          </>
        ) : (
          <>
            <Clock size={42} className="text-cyan-300 mx-auto animate-pulse" />
            <p className="font-headline text-xl font-bold text-on-surface">Đang chờ duyệt</p>
            <p className="text-sm text-secondary/80">
              Cảm ơn bạn! Giảng viên sẽ đối soát chuyển khoản và gửi email xác nhận trong vòng 24h.
              <br />
              Trang này sẽ tự cập nhật khi đơn hàng được duyệt.
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
