import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Login() {
  return (
    <PageShell>
      <div className="max-w-md mx-auto">
        <SectionHeading
          eyebrow="Auth"
          title="Đăng nhập"
          subtitle="Auth flow sẽ được wire trong Phase 2.1 với Supabase."
        />
        <div className="mt-8 glass-card rounded-2xl p-8 space-y-4">
          <div className="space-y-1.5">
            <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60">Email</label>
            <input type="email" disabled className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface placeholder:text-secondary/40" placeholder="ban@email.vn" />
          </div>
          <div className="space-y-1.5">
            <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60">Mật khẩu</label>
            <input type="password" disabled className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface" placeholder="••••••••" />
          </div>
          <button disabled className="w-full bg-primary/30 text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase opacity-60 cursor-not-allowed">
            Đăng nhập (sắp có)
          </button>
        </div>
      </div>
    </PageShell>
  );
}
