import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Account() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Account"
        title="Tài khoản"
        subtitle="Hồ sơ, lịch sử mua khoá học, đổi mật khẩu — tất cả ở đây."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Phase 2 sẽ wire profile management.</p>
      </div>
    </PageShell>
  );
}
