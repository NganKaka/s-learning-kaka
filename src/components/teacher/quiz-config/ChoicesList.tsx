import { CheckCircle2, Trash2, Plus } from 'lucide-react';

/**
 * MCQ choices editor: renders each choice with a correct-answer toggle button,
 * editable text, remove button, and an "add choice" footer button.
 * Used by QuestionEditor for single/multi question types.
 */
export interface ChoicesListProps {
  choices: string[];
  correct: number[];
  onToggleCorrect: (idx: number) => void;
  onUpdateChoice: (idx: number, value: string) => void;
  onAddChoice: () => void;
  onRemoveChoice: (idx: number) => void;
}

export default function ChoicesList({
  choices,
  correct,
  onToggleCorrect,
  onUpdateChoice,
  onAddChoice,
  onRemoveChoice,
}: ChoicesListProps) {
  return (
    <div className="space-y-2">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        Đáp án (đánh dấu đáp án đúng)
      </label>
      {choices.map((choice, ci) => {
        const isCorrect = correct.includes(ci);
        return (
          <div key={ci} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleCorrect(ci)}
              className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
                isCorrect
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/15 text-secondary/55 hover:border-cyan-300/40'
              }`}
              aria-label={isCorrect ? 'Đáp án đúng' : 'Đặt làm đáp án đúng'}
            >
              {isCorrect ? <CheckCircle2 size={14} /> : String.fromCharCode(65 + ci)}
            </button>
            <input
              type="text"
              defaultValue={choice}
              onBlur={(e) => onUpdateChoice(ci, e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
            {choices.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveChoice(ci)}
                className="text-red-400/70 hover:text-red-300"
                aria-label="Xoá đáp án"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAddChoice}
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[0.06] px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/[0.1]"
      >
        <Plus size={10} /> Thêm đáp án
      </button>
    </div>
  );
}
