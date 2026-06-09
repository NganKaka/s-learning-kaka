import { Plus, Sparkles, Loader2 } from 'lucide-react';

/**
 * Banner shown when no quiz exists yet for the lesson, with a "Create quiz" button.
 */
export interface QuizEmptyStateProps {
  creating: boolean;
  onCreate: () => void;
}

export default function QuizEmptyState({ creating, onCreate }: QuizEmptyStateProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-primary">
        <Sparkles size={11} /> Chưa có quiz
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-60"
      >
        {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Tạo quiz
      </button>
    </div>
  );
}
