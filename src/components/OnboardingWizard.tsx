import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { upsertGoal } from '../lib/studyGoals';

const STEPS = ['welcome', 'goal', 'done'] as const;

export default function OnboardingWizard({ userId, displayName, onComplete }: { userId: string; displayName: string | null; onComplete: () => void }) {
  const [step, setStep] = useState<(typeof STEPS)[number]>('welcome');
  const [goals, setGoals] = useState({ lessons: 3, flashcards: 50, quizzes: 2 });

  const finish = async () => {
    await upsertGoal(userId, { lessons_target: goals.lessons, flashcards_target: goals.flashcards, quizzes_target: goals.quizzes });
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 shadow-2xl text-center space-y-6"
        >
          {step === 'welcome' && (
            <>
              <Sparkles size={40} className="mx-auto text-primary" />
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Chào mừng{displayName ? `, ${displayName}` : ''}!</h2>
              <p className="text-secondary/70">Hãy thiết lập mục tiêu học tập để bắt đầu hành trình.</p>
              <button onClick={() => setStep('goal')} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-6 py-3 text-sm font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25">
                Tiếp tục <ArrowRight size={14} />
              </button>
            </>
          )}

          {step === 'goal' && (
            <>
              <Target size={40} className="mx-auto text-cyan-300" />
              <h2 className="font-headline text-xl font-extrabold text-on-surface">Mục tiêu tuần</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-tech text-[9px] uppercase text-secondary/55">Bài học</label>
                  <input type="number" min={1} value={goals.lessons} onChange={(e) => setGoals((g) => ({ ...g, lessons: Math.max(1, +e.target.value) }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="font-tech text-[9px] uppercase text-secondary/55">Flashcards</label>
                  <input type="number" min={1} value={goals.flashcards} onChange={(e) => setGoals((g) => ({ ...g, flashcards: Math.max(1, +e.target.value) }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="font-tech text-[9px] uppercase text-secondary/55">Quiz</label>
                  <input type="number" min={1} value={goals.quizzes} onChange={(e) => setGoals((g) => ({ ...g, quizzes: Math.max(1, +e.target.value) }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none" />
                </div>
              </div>
              <button onClick={() => { setStep('done'); finish(); }} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-6 py-3 text-sm font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25">
                Hoàn tất <ArrowRight size={14} />
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <BookOpen size={40} className="mx-auto text-emerald-400" />
              <h2 className="font-headline text-xl font-extrabold text-on-surface">Sẵn sàng!</h2>
              <p className="text-secondary/70">Bắt đầu học ngay thôi. Chúc bạn học tốt! 🎉</p>
              <button onClick={onComplete} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-6 py-3 text-sm font-tech uppercase tracking-[0.16em] text-emerald-200 hover:bg-emerald-500/25">
                Vào học
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
