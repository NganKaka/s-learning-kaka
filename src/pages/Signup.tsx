import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { translateAuthError } from './Login';
import { sendWelcomeIfNeeded } from '../lib/welcome';

export default function Signup() {
  const { user, signUp, signInWithGoogle, loading } = useAuth();
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

    // Fire-and-forget welcome email if a session is already live (auto-confirm
    // projects). If email confirmation is required, the session is null until
    // the user clicks the link, and the welcome will be sent on first login
    // via AuthContext instead.
    void sendWelcomeIfNeeded();

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

              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-white/10" />
                <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-secondary/45">hoặc</span>
                <span className="flex-1 h-px bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle('/dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white text-[#1a1a1a] px-6 py-3 text-xs font-bold tracking-wide hover:bg-white/95 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Tiếp tục với Google
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
