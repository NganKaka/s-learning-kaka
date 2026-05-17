import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, RotateCcw } from 'lucide-react';
import { fetchLessonCards } from '../lib/srs';

/**
 * Inline flashcard reveal-on-click set, rendered below the lesson video.
 * Cards expand from a compact list — tap a row to flip it. No SRS rating
 * here; the dedicated /cards review page handles that.
 */
export default function LessonCards({ lessonId }: { lessonId: string }) {
  const [cards, setCards] = useState<Array<{ id: string; front_md: string; back_md: string; order_index: number }> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    fetchLessonCards(lessonId).then((rows) => {
      if (cancelled) return;
      setCards(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (!cards || cards.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
        <Brain size={12} />
        <span>Flashcards của bài</span>
        <span className="text-secondary/40">·</span>
        <span className="text-secondary/55">{cards.length} thẻ</span>
      </div>
      <p className="text-xs text-secondary/60">
        Nhấn để mở thẻ, ôn lại trong phiên tổng hợp tại{' '}
        <a href="/cards" className="text-cyan-300 hover:text-cyan-200 underline">/cards</a>.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} open={openId === card.id} onToggle={() => setOpenId(openId === card.id ? null : card.id)} />
        ))}
      </div>
    </section>
  );
}

function CardItem({
  card,
  open,
  onToggle,
}: {
  card: { id: string; front_md: string; back_md: string };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left glass-card rounded-2xl px-4 py-3 transition-all ${open ? 'border-cyan-300/40 bg-cyan-400/[0.05]' : 'hover:border-cyan-300/30'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-headline text-sm font-bold text-on-surface whitespace-pre-line">{card.front_md}</p>
        <ChevronDown size={14} className={`text-secondary/45 transition-transform shrink-0 mt-1 ${open ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-950/15 px-3 py-2.5 text-sm text-cyan-100/85 whitespace-pre-line">
              {card.back_md}
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-tech text-[9px] uppercase tracking-[0.16em] text-secondary/45">
              <RotateCcw size={10} /> Nhấn lần nữa để đóng
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
