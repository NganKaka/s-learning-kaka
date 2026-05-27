import { useEffect, useState } from 'react';
import { Target, Loader2, CheckCircle2 } from 'lucide-react';
import { type StudyGoal, getCurrentGoal, upsertGoal } from '../lib/studyGoals';

export default function StudyPlanner({ userId }: { userId: string }) {
  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState({ lessons_target: 3, flashcards_target: 50, quizzes_target: 2 });

  useEffect(() => {
    getCurrentGoal(userId).then((g) => { setGoal(g); setLoading(false); if (g) setTargets({ lessons_target: g.lessons_target, flashcards_target: g.flashcards_target, quizzes_target: g.quizzes_target }); });
  }, [userId]);

  const save = async () => {
    const g = await upsertGoal(userId, targets);
    setGoal(g);
    setEditing(false);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  if (!goal && !editing) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          <Target size={12} /> Mục tiêu tuần
        </p>
        <p className="text-sm text-secondary/70">Đặt mục tiêu học tập cho tuần này để theo dõi tiến độ.</p>
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25">
          Đặt mục tiêu
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          <Target size={12} /> Đặt mục tiêu tuần
        </p>
        <div className="grid grid-cols-3 gap-3">
          <GoalInput label="Bài học" value={targets.lessons_target} onChange={(v) => setTargets((t) => ({ ...t, lessons_target: v }))} />
          <GoalInput label="Flashcards" value={targets.flashcards_target} onChange={(v) => setTargets((t) => ({ ...t, flashcards_target: v }))} />
          <GoalInput label="Quiz" value={targets.quizzes_target} onChange={(v) => setTargets((t) => ({ ...t, quizzes_target: v }))} />
        </div>
        <button onClick={save} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25">
          Lưu
        </button>
      </div>
    );
  }

  const progress = [
    { label: 'Bài học', done: goal!.lessons_done, target: goal!.lessons_target },
    { label: 'Flashcards', done: goal!.flashcards_done, target: goal!.flashcards_target },
    { label: 'Quiz', done: goal!.quizzes_done, target: goal!.quizzes_target },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          <Target size={12} /> Mục tiêu tuần
          {goal!.met && <CheckCircle2 size={12} className="text-emerald-400" />}
        </p>
        <button onClick={() => setEditing(true)} className="font-tech text-[10px] uppercase text-secondary/60 hover:text-cyan-200">Sửa</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {progress.map((p) => {
          const pct = Math.min(100, (p.done / Math.max(1, p.target)) * 100);
          return (
            <div key={p.label} className="text-center space-y-1">
              <div className="relative w-14 h-14 mx-auto">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={pct >= 100 ? '#34d399' : '#67e8f9'} strokeWidth="4" strokeDasharray={`${pct * 1.508} 150.8`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-tech text-[10px] tabular-nums text-on-surface">
                  {p.done}/{p.target}
                </span>
              </div>
              <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">{p.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">{label}</label>
      <input type="number" min={1} value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-on-surface text-center focus:border-cyan-300/40 focus:outline-none" />
    </div>
  );
}
