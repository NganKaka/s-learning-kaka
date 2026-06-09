/**
 * Course card component for dashboard - shows enrolled course with progress.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, Trophy } from 'lucide-react';
import { formatDuration } from '../../lib/courses';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface EnrolledCourse {
  id: string;
  slug: string;
  title: string;
  cover_image: string | null;
  duration_minutes: number;
  granted_at: string;
  total_lessons: number;
  completed_lessons: number;
}

interface CourseCardProps {
  course: EnrolledCourse;
  studentName: string;
}

export function CourseCard({ course, studentName }: CourseCardProps) {
  const [downloading, setDownloading] = useState(false);
  const completed = course.total_lessons > 0 && course.completed_lessons >= course.total_lessons;

  const handleDownloadCert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const [{ generateCertificatePdf, downloadPdf }] = await Promise.all([
        import('../../lib/certificatePdf'),
      ]);
      const bytes = await generateCertificatePdf({
        studentName,
        courseTitle: course.title,
        completionDate: new Date(),
      });
      downloadPdf(bytes, `sLearningKaka-${course.slug}-${studentName.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const progressPercent =
    course.total_lessons > 0
      ? Math.round((course.completed_lessons / course.total_lessons) * 100)
      : 0;

  return (
    <div className="group glass-card rounded-2xl overflow-hidden transition-all hover:border-cyan-300/35">
      <Link to={`/courses/${course.slug}`} className="block">
        {/* Neutral placeholder bg prevents image pop-in flash */}
        <div className="aspect-video overflow-hidden bg-white/[0.06]">
          {course.cover_image && (
            <img
              src={course.cover_image}
              alt={course.title}
              className="h-full w-full object-cover opacity-80 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
              loading="lazy"
            />
          )}
        </div>
      </Link>
      <div className="p-5 space-y-3">
        <Link to={`/courses/${course.slug}`}>
          <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-cyan-200 transition-colors">
            {course.title}
          </h3>
        </Link>

        {course.total_lessons > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
              <span>
                {course.completed_lessons} / {course.total_lessons} bài
              </span>
              <span className="text-cyan-200 tabular-nums">{progressPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-cyan-200 transition-[width] duration-500"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
          {course.duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} className="text-cyan-300" aria-hidden="true" />{' '}
              {formatDuration(course.duration_minutes)}
            </span>
          )}
          {/* Badge replaces the inline ad-hoc pill */}
          <Badge tone="info" size="sm" icon={<Trophy size={10} />}>
            Đã đăng ký
          </Badge>
        </div>

        {completed && (
          // Button primitive replaces the ad-hoc cert download button
          <Button
            variant="primary"
            size="sm"
            loading={downloading}
            onClick={handleDownloadCert}
            className="w-full"
          >
            {!downloading && <Award size={12} aria-hidden="true" />}
            Tải chứng chỉ
          </Button>
        )}
      </div>
    </div>
  );
}
