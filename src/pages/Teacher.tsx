import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Teacher() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Teacher"
        title="Khu vực giảng viên"
        subtitle="Phase 4.1 sẽ build trình quản lý khoá học, bài giảng, flashcard, doanh thu."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Trang admin chỉ hiển thị cho user có role giảng viên.</p>
      </div>
    </PageShell>
  );
}
