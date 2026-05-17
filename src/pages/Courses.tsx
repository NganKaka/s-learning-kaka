import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Courses() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Catalog"
        title="Tất cả khoá học"
        subtitle="Bộ sưu tập các khoá học hiện có. Mỗi khoá đi kèm video, flashcard, quiz và chứng chỉ hoàn thành."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Chưa có khoá học nào — Phase 1 sẽ kéo dữ liệu từ Supabase vào đây.</p>
      </div>
    </PageShell>
  );
}
