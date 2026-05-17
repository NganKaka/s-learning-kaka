import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { translateAuthError } from './Login';

export default function Signup() {
  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const { error } = await signUp(email, password, displayName);
    setSubmitting(false);
    if (error) {
      setErrorMsg(translateAuthError(error));
      return;
    }
    setDone(true);
    // Supabase by default sends an email confirmation. If your project has
    // auto-confirm on, the session is already live and we can redirect.
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
  };

  return (
    <PageShell>
      <div className="max-w-md mx-auto">
        <SectionHeading
          eyebrow="Auth"
          title="Đăng ký miễn phí"
          subtitle="Tạo tài khoản để mua khoá học và theo dõi tiến độ."
        />

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 glass-card rounded-2xl p-8 text-center space-y-3"
            >
              <CheckCircle2 size={36} className="text-primary mx-auto" />
              <p className="font-headline text-lg font-bold text-on-surface">Tạo tài khoản thành công</p>
              <p className="text-sm text-secondary/80">
                Nếu Supabase yêu cầu xác nhận email, vui lòng kiểm tra hộp thư của bạn.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onSubmit={handleSubmit}
              className="mt-8 glass-card rounded-2xl p-6 md:p-8 space-y-4"
            >
              <Field icon={UserIcon} label="Họ tên hiển thị" type="text" value={displayName} onChange={setDisplayName} required autoComplete="name" />
              <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
              <Field icon={Lock} label="Mật khẩu (≥6 ký tự)" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Đang tạo tài khoản…
                  </>
                ) : (
                  'Tạo tài khoản'
                )}
              </button>

              <p className="text-center text-xs text-secondary/60 pt-2">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-cyan-300 hover:text-cyan-200 underline">
                  Đăng nhập
                </Link>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

interface FieldProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}

function Field({ icon: Icon, label, type, value, onChange, autoComplete, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="relative">
        <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary/45" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-on-surface placeholder:text-secondary/40 transition-all focus:border-cyan-300/50 focus:bg-cyan-400/[0.04] focus:outline-none"
        />
      </div>
    </div>
  );
}
