import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={next} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
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
          <Field
            icon={Lock}
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />

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

export { translateAuthError };
