import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { fetchDueCards, submitReview, type DueCard, type Rating } from '../lib/srs';

const RATING_BUTTONS: Array<{ rating: Rating; label: string; sub: string; tone: 'red' | 'orange' | 'cyan' | 'green' }> = [
  { rating: 0, label: 'Lại', sub: '~10 phút', tone: 'red' },
  { rating: 1, label: 'Khó', sub: 'sớm hơn', tone: 'orange' },
  { rating: 2, label: 'Tốt', sub: 'theo lịch', tone: 'cyan' },
  { rating: 3, label: 'Dễ', sub: 'lâu hơn', tone: 'green' },
];

const TONE_CLASS: Record<'red' | 'orange' | 'cyan' | 'green', string> = {
  red: 'border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
  orange: 'border-orange-400/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20',
  cyan: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20',
  green: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
};

export default function Cards() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const due = await fetchDueCards(user.id);
      if (!cancelled) {
        setCards(due);
        setIndex(0);
        setFlipped(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
      </PageShell>
    );
  }

  if (!user) return <Navigate to="/login?next=/cards" replace />;

  const total = cards?.length ?? 0;
  const card = cards?.[index] ?? null;
  const done = cards !== null && index >= total;

  const handleRate = async (rating: Rating) => {
    if (!card || submitting) return;
    setSubmitting(true);
    await submitReview({ userId: user.id, cardId: card.id, rating });
    setSubmitting(false);
    setReviewedCount((n) => n + 1);
    setIndex((i) => i + 1);
    setFlipped(false);
  };

  const handleRestart = async () => {
    if (!user) return;
    setCards(null);
    const due = await fetchDueCards(user.id);
    setCards(due);
    setIndex(0);
    setFlipped(false);
    setReviewedCount(0);
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Spaced Repetition"
        title="Thẻ ghi nhớ hôm nay"
        subtitle="Mỗi thẻ ôn đúng lúc bạn sắp quên — bộ não tích trữ kiến thức tốt hơn so với học dồn."
      />

      {cards === null ? (
        <div className="mt-10 glass-card rounded-2xl p-12 animate-pulse h-64" />
      ) : total === 0 ? (
        <div className="mt-10 glass-card rounded-2xl p-12 text-center space-y-3">
          <Brain size={28} className="text-cyan-300 mx-auto" />
          <p className="font-headline text-xl font-bold text-on-surface">Hôm nay không có thẻ cần ôn</p>
          <p className="text-sm text-secondary/75">
            Khi giảng viên thêm flashcard vào bài học bạn đã đăng ký, các thẻ sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : done ? (
        <div className="mt-10 glass-card rounded-2xl p-12 text-center space-y-4">
          <CheckCircle2 size={36} className="text-primary mx-auto" />
          <p className="font-headline text-2xl font-bold text-on-surface">Hoàn thành phiên ôn tập!</p>
          <p className="text-sm text-secondary/80">
            Bạn vừa ôn <strong className="text-cyan-200">{reviewedCount}</strong> thẻ. Hẹn gặp lại ngày mai.
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 mt-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
          >
            <RotateCcw size={12} /> Tải lại
          </button>
        </div>
      ) : card ? (
        <div className="mt-10 space-y-5">
          {/* Progress */}
          <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            <span className="tabular-nums text-primary">{String(index + 1).padStart(2, '0')}</span>
            <span className="text-secondary/30">/</span>
            <span className="tabular-nums">{String(total).padStart(2, '0')}</span>
            <span className="text-secondary/30">·</span>
            <span>{card.course_title ?? 'Khoá học'}</span>
            {card.lesson_title && (
              <>
                <span className="text-secondary/30">·</span>
                <span>{card.lesson_title}</span>
              </>
            )}
          </div>

          {/* Card */}
          <div className="relative" style={{ perspective: '1200px' }}>
            <motion.div
              className="relative cursor-pointer"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d', minHeight: 300 }}
              onClick={() => setFlipped((p) => !p)}
            >
              <div
                className="glass-card absolute inset-0 rounded-3xl p-8 md:p-12 flex items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="space-y-3">
                  <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Mặt trước</p>
                  <p className="font-headline text-2xl md:text-3xl text-on-surface whitespace-pre-line">
                    {card.front_md}
                  </p>
                  <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/45">
                    Nhấn để xem đáp án
                  </p>
                </div>
              </div>
              <div
                className="glass-card absolute inset-0 rounded-3xl p-8 md:p-12 flex items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="space-y-3">
                  <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-300">Đáp án</p>
                  <p className="font-headline text-xl md:text-2xl text-on-surface whitespace-pre-line">
                    {card.back_md}
                  </p>
                  <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/45">
                    Đánh giá độ khó bên dưới
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <AnimatePresence>
            {flipped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2"
              >
                {RATING_BUTTONS.map((btn) => (
                  <button
                    key={btn.rating}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRate(btn.rating)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-4 transition-all ${TONE_CLASS[btn.tone]} disabled:opacity-50`}
                  >
                    <span className="font-headline font-bold text-base">{btn.label}</span>
                    <span className="font-tech text-[9px] uppercase tracking-[0.14em] opacity-80">{btn.sub}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!flipped && (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="block mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
              Xem đáp án
            </button>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
