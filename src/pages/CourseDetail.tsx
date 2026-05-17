import { useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Course"
        title={slug ?? 'Khoá học'}
        subtitle="Trang chi tiết khoá học. Phase 1 sẽ render giáo trình, giảng viên, giá tiền và CTA mua khoá học."
      />
      <div className="mt-10 glass-card rounded-2xl p-12 text-center">
        <p className="text-secondary/70 font-tech text-xs uppercase tracking-[0.2em]">Slug: {slug}</p>
      </div>
    </PageShell>
  );
}
