import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Trophy, Clock, BarChart3, ExternalLink } from 'lucide-react';
import PageShell from '../components/PageShell';
import DocumentHead from '../components/DocumentHead';
import NameDecode from '../components/ui/NameDecode';
import GradientText from '../components/ui/GradientText';
import SectionHeading from '../components/ui/SectionHeading';
import { useFeaturedCourse, formatVnd, formatDuration } from '../lib/courses';

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export default function Home() {
  const { data: featured, loading } = useFeaturedCourse();

  return (
    <PageShell>
      <DocumentHead
        title="sLearningKaka — Học cùng Vo Hoang Ngan"
        description="Nền tảng học tập cho học sinh Việt Nam: video bài giảng, flashcard ôn tập, quiz đánh giá, chứng chỉ hoàn thành. Khoá đầu tiên — Toán 12."
        url="https://s-learning-kaka.vercel.app/"
      />
      <section id="hero" className="relative pt-12 md:pt-20 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
        <div className="space-y-7">
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-on-surface leading-tight">
            <NameDecode text="Học để làm được" duration={750} charLockDuration={280} />
          </h1>
          <p className="text-lg md:text-xl font-headline font-bold">
            <GradientText text="Khoá học chất lượng — dạy bởi Vo Hoang Ngan" />
          </p>
          <p className="text-secondary/85 leading-relaxed max-w-xl">
            Video bài giảng có cấu trúc, flashcard ôn tập theo phương pháp lặp lại ngắt quãng,
            quiz kiểm tra hiểu bài, và theo dõi tiến độ học tập — tất cả ở một nơi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/courses"
              className="shimmer-sweep bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow inline-flex items-center gap-2"
            >
              Xem khoá học <ArrowRight size={14} />
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-cyan-100 transition-colors"
            >
              Đăng ký miễn phí
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-3xl p-6 ambient-shadow min-h-[320px] animate-pulse" />
        ) : featured ? (
          <Link
            to={`/courses/${featured.slug}`}
            className="group glass-card block rounded-3xl overflow-hidden ambient-shadow transition-all hover:border-cyan-300/35"
          >
            {featured.cover_image && (
              <div className="aspect-video overflow-hidden bg-white/[0.02] relative">
                <img
                  src={featured.cover_image}
                  alt={featured.title}
                  className="h-full w-full object-cover opacity-80 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute top-3 left-3 inline-flex rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 font-tech text-[9px] uppercase tracking-[0.16em] text-primary backdrop-blur-sm">
                  Khoá học nổi bật
                </div>
              </div>
            )}

            <div className="p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                <BarChart3 size={12} className="text-cyan-300" />
                <span>{LEVEL_LABEL[featured.level] ?? featured.level}</span>
                {featured.duration_minutes > 0 && (
                  <>
                    <span className="text-secondary/30">·</span>
                    <Clock size={12} className="text-cyan-300" />
                    <span>{formatDuration(featured.duration_minutes)}</span>
                  </>
                )}
              </div>

              <h2 className="font-headline text-2xl font-bold text-on-surface group-hover:text-cyan-200 transition-colors">
                {featured.title}
              </h2>

              {featured.subtitle && (
                <p className="text-sm text-secondary/80 leading-relaxed line-clamp-2">{featured.subtitle}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="font-headline text-xl font-bold text-primary tabular-nums">
                  {featured.price_vnd === 0 ? 'Miễn phí' : formatVnd(featured.price_vnd)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-tech uppercase tracking-[0.14em] text-cyan-300 group-hover:gap-2 transition-all">
                  Xem chi tiết <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="glass-card rounded-3xl p-6 ambient-shadow space-y-4">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Hôm nay</p>
            <div className="space-y-3">
              {[
                { icon: BookOpen, label: 'Bài học mới', value: '0' },
                { icon: Brain, label: 'Flashcard cần ôn', value: '0' },
                { icon: Trophy, label: 'Streak', value: '0 ngày' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <row.icon size={16} className="text-cyan-300" />
                    <span className="text-sm text-secondary/80">{row.label}</span>
                  </div>
                  <span className="font-headline text-lg font-bold text-on-surface tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-secondary/55 text-center pt-2">Đăng nhập để bắt đầu học.</p>
          </div>
        )}
      </section>

      <div className="mt-24 space-y-24">
        <section id="how-it-works">
          <SectionHeading
            eyebrow="Phương pháp"
            title="Học sao cho nhớ lâu"
            subtitle="Mỗi khoá học kết hợp video bài giảng, flashcard ôn tập, quiz đánh giá và theo dõi tiến độ — bốn yếu tố then chốt giúp kiến thức ở lại."
          />

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Video bài giảng',
                body: 'Bài giảng có cấu trúc, kèm transcript và mã nguồn để bạn học theo nhịp riêng.',
                icon: BookOpen,
              },
              {
                title: 'Flashcard ôn tập',
                body: 'Lặp lại ngắt quãng (SRS) đảm bảo bạn ôn đúng thứ mình sắp quên.',
                icon: Brain,
              },
              {
                title: 'Quiz & dự án',
                body: 'Câu hỏi cuối bài giúp xác định lỗ hổng kiến thức trước khi bước tiếp.',
                icon: Trophy,
              },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-2xl p-6 space-y-3">
                <item.icon size={18} className="text-cyan-300" />
                <p className="font-headline text-lg font-bold text-on-surface">{item.title}</p>
                <p className="text-secondary/85 leading-relaxed text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="instructor">
          <SectionHeading
            eyebrow="Giảng viên"
            title="Vo Hoang Ngan"
            subtitle="Software Engineer · Cử nhân CS HCMUT · Huy chương Olympic Toán quốc tế (HKIMO Vàng, AIMO Bạc, IGO)."
          />

          <div className="mt-8 grid md:grid-cols-[1fr_auto] items-center gap-6 glass-card rounded-2xl p-6 md:p-8 ambient-shadow">
            <div className="space-y-4">
              <p className="text-secondary/85 leading-relaxed">
                Giảng viên kiêm kỹ sư phần mềm tại HCM. Nền tảng Toán mạnh từ thời kỳ chuyên Toán
                Lê Hồng Phong, kết hợp kinh nghiệm xây dựng sản phẩm thật giúp việc giảng dạy
                không chỉ ở mức "biết làm bài" — học sinh hiểu được tại sao và áp dụng được.
              </p>
              <div className="flex flex-wrap gap-2">
                {['VMO 3rd', 'HKIMO Gold', 'AIMO Silver', 'IGO Aluminium', 'Le Hong Phong Math'].map((tag) => (
                  <span key={tag} className="rounded-full border border-cyan-300/20 bg-cyan-950/15 px-3 py-1 font-tech text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="https://s-profile-kaka.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-5 py-3 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 hover:shadow-[0_0_18px_rgba(233,195,73,0.32)] transition-all"
              >
                Hồ sơ đầy đủ <ExternalLink size={12} />
              </a>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary/30 to-cyan-400/20 blur-xl" />
                <div className="relative h-32 w-32 rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/20 to-cyan-400/15 flex items-center justify-center font-headline text-3xl font-extrabold text-primary tabular-nums">
                  VHN
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
