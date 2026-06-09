import { type AnswerValue, type QuizQuestion } from '../../lib/quiz';
import { type PendingFile } from './types';
import FileDropZone from './FileDropZone';

interface QuestionCardProps {
  index: number;
  question: QuizQuestion;
  answer: AnswerValue | undefined;
  onAnswerChange: (next: AnswerValue) => void;
  staged: PendingFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (idx: number) => void;
}

/**
 * Renders a single quiz question with its answer input.
 *
 * Supports four question types:
 *   - `single` — one-of-many choice (radio-style)
 *   - `multi`  — many-of-many choices (checkbox-style)
 *   - `text`   — free-text textarea
 *   - `file`   — delegated to FileDropZone
 */
export default function QuestionCard({
  index,
  question,
  answer,
  onAnswerChange,
  staged,
  onFilesAdded,
  onFileRemove,
}: QuestionCardProps) {
  const choices = question.choices_jsonb ?? [];
  const multi = question.type === 'multi';

  const toggleChoice = (idx: number) => {
    const cur = answer?.kind === 'choice' ? answer.choices : [];
    if (multi) {
      const next = cur.includes(idx) ? cur.filter((c) => c !== idx) : [...cur, idx].sort();
      onAnswerChange({ kind: 'choice', choices: next });
    } else {
      onAnswerChange({ kind: 'choice', choices: [idx] });
    }
  };

  const picked = answer?.kind === 'choice' ? answer.choices : [];

  return (
    <div className="space-y-3">
      <p className="font-headline text-base font-bold text-on-surface">
        <span className="text-primary mr-2 tabular-nums">
          {String(index + 1).padStart(2, '0')}.
        </span>
        {question.prompt_md}
        <span className="ml-2 font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">
          ({question.points} điểm
          {multi
            ? ' · chọn nhiều'
            : question.type === 'text'
              ? ' · điền đáp án'
              : question.type === 'file'
                ? ' · nộp tệp'
                : ''}
          )
        </span>
      </p>

      {(question.type === 'single' || question.type === 'multi') && (
        <div className="space-y-2">
          {choices.map((choice, ci) => {
            const isPicked = picked.includes(ci);
            return (
              <button
                key={ci}
                type="button"
                onClick={() => toggleChoice(ci)}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all text-sm ${
                  isPicked
                    ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30'
                }`}
              >
                <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55 tabular-nums shrink-0">
                  {String.fromCharCode(65 + ci)}
                </span>
                <span className="flex-1">{choice}</span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'text' && (
        <textarea
          value={answer?.kind === 'text' ? answer.text : ''}
          onChange={(e) => onAnswerChange({ kind: 'text', text: e.target.value })}
          rows={3}
          placeholder="Nhập đáp án của bạn…"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      )}

      {question.type === 'file' && (
        <FileDropZone staged={staged} onFilesAdded={onFilesAdded} onRemove={onFileRemove} />
      )}
    </div>
  );
}
