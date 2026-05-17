import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Dashboard() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Dashboard"
        title="Bảng điều khiển của bạn"
        subtitle="Khoá học đang học, flashcard cần ôn, streak hiện tại — tất cả ở một nơi."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Đăng nhập để xem tiến độ học tập (Phase 2).</p>
      </div>
    </PageShell>
  );
}
