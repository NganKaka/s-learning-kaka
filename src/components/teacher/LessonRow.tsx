/**
 * Lesson row component with expandable editor and quiz modal.
 */
import { ChevronDown, Plus, Sparkles, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { Lesson } from '../../lib/database.types';
import { LessonMetaEditor } from './LessonMetaEditor';
import { FlashcardsEditor } from './FlashcardsEditor';
import QuizConfigEditor from '../QuizConfigEditor';

interface LessonRowProps {
  lesson: Lesson;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: () => void;
  courseId: string;
}

export function LessonRow({ lesson, index, isOpen, onToggle, onChange, courseId }: LessonRowProps) {
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [hasQuiz, setHasQuiz] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lesson.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasQuiz(!!data);
      });
  }, [lesson.id, quizModalOpen]);

  return (
    <>
      <li className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 tabular-nums shrink-0">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-sm text-on-surface truncate">{lesson.title}</span>
            {lesson.is_preview && (
              <span className="font-tech text-[9px] uppercase tracking-[0.16em] text-cyan-300/85 shrink-0">
                Xem thử
              </span>
            )}
            {lesson.bunny_video_id ? (
              <Video size={11} className="text-emerald-300 shrink-0" />
            ) : (
              <Video size={11} className="text-secondary/40 shrink-0" />
            )}
          </div>
          <ChevronDown
            size={14}
            className={`text-secondary/45 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
            <LessonMetaEditor lesson={lesson} onChange={onChange} />
            <FlashcardsEditor lessonId={lesson.id} courseId={courseId} />

            <button
              type="button"
              onClick={() => setQuizModalOpen(true)}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors ${
                hasQuiz
                  ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border-dashed border-cyan-300/30 bg-cyan-400/[0.04] text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-400/[0.08]'
              }`}
            >
              <Sparkles size={12} />
              {hasQuiz ? 'Chỉnh sửa Quiz' : 'Thêm Quiz'}
            </button>
          </div>
        )}
      </li>

      {/* Quiz fullscreen modal */}
      <AnimatePresence>
        {quizModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
          >
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setQuizModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-3xl mt-24 mb-8 mx-4 rounded-2xl border border-white/10 bg-[#0a0f1e] p-6 md:p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setQuizModalOpen(false)}
                className="absolute top-4 right-4 rounded-full border border-white/15 bg-white/[0.05] p-2 text-secondary/60 hover:text-on-surface hover:bg-white/[0.1] transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>

              <p className="font-headline text-lg font-bold text-on-surface mb-5">
                Quiz — {lesson.title}
              </p>

              <QuizConfigEditor lessonId={lesson.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
