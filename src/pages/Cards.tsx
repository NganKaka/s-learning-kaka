import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function Cards() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Spaced Repetition"
        title="Thẻ ghi nhớ"
        subtitle="Ôn tập theo lịch giãn cách (SRS) — mỗi ngày chỉ xem những thẻ bạn sắp quên."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70">Chưa có thẻ nào — flashcard sẽ xuất hiện sau khi bạn học bài (Phase 3.1).</p>
      </div>
    </PageShell>
  );
}
