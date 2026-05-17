import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Signup() {
  return (
    <PageShell>
      <div className="max-w-md mx-auto">
        <SectionHeading
          eyebrow="Auth"
          title="Đăng ký miễn phí"
          subtitle="Tạo tài khoản để theo dõi tiến độ và mua khoá học."
        />
        <div className="mt-8 glass-card rounded-2xl p-8 text-center">
          <p className="text-secondary/70">Phase 2.1 sẽ wire form đăng ký với Supabase Auth.</p>
        </div>
      </div>
    </PageShell>
  );
}
