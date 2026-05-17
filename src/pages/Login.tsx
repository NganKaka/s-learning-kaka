import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { setSessionPersistence } from '../lib/supabase';

const REMEMBER_KEY = 'sLearningKaka.rememberMe';

export default function Login() {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    return saved === null ? true : saved === '1';
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={next} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    setSessionPersistence(remember);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setErrorMsg(translateAuthError(error));
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <PageShell>
      <div className="max-w-md mx-auto">
        <SectionHeading
          eyebrow="Auth"
          title="Đăng nhập"
          subtitle="Chào mừng bạn quay lại."
        />

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="mt-8 glass-card rounded-2xl p-6 md:p-8 space-y-4"
        >
          <Field
            icon={Mail}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <PasswordField
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />

          <label className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/65 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-primary"
            />
            Ghi nhớ tôi trên thiết bị này
          </label>

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
                <Loader2 size={14} className="animate-spin" /> Đang đăng nhập…
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          <div className="flex items-center gap-3 my-1">
            <span className="flex-1 h-px bg-white/10" />
            <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-secondary/45">hoặc</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={async () => {
              await signInWithGoogle(next);
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white text-[#1a1a1a] px-6 py-3 text-xs font-bold tracking-wide hover:bg-white/95 transition-colors"
          >
            <GoogleIcon /> Tiếp tục với Google
          </button>

          <p className="text-center text-xs text-secondary/60 pt-2">
            Chưa có tài khoản?{' '}
            <Link to="/signup" className="text-cyan-300 hover:text-cyan-200 underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </motion.form>
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

function PasswordField({
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60">
        Mật khẩu <span className="text-primary">*</span>
      </label>
      <div className="relative">
        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary/45" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-12 text-sm text-on-surface placeholder:text-secondary/40 transition-all focus:border-cyan-300/50 focus:bg-cyan-400/[0.04] focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary/55 hover:text-cyan-200 hover:bg-cyan-400/[0.08] transition-colors"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function translateAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Vui lòng xác nhận email trước khi đăng nhập.';
  }
  return msg;
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export { translateAuthError };
