import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import CustomSelect from '../../ui/CustomSelect';
import type { QuizQuestion, QuizQuestionType } from '../../../lib/quiz';
import ConfigField from './ConfigField';
import ImageUploader from './ImageUploader';
import ChoicesList from './ChoicesList';

/**
 * Single-question editor card. Renders prompt, type selector, choices (for MCQ),
 * expected_text (for text type), image uploader (for image type), and explanation.
 */
export interface QuestionEditorProps {
  index: number;
  question: QuizQuestion;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

export default function QuestionEditor({
  index,
  question,
  onChange,
  onDelete,
  onMove,
}: QuestionEditorProps) {
  const choices = question.choices_jsonb ?? [];
  const correct = question.correct_jsonb ?? [];

  const setType = (type: QuizQuestionType) => {
    const patch: Partial<QuizQuestion> = { type };
    if (type === 'single') {
      patch.choices_jsonb = choices.length > 0 ? choices : ['Lựa chọn A', 'Lựa chọn B'];
      patch.correct_jsonb = correct.length === 1 ? correct : [0];
      patch.expected_text = null;
    } else if (type === 'multi') {
      patch.choices_jsonb = choices.length > 0 ? choices : ['Lựa chọn A', 'Lựa chọn B'];
      patch.correct_jsonb = correct;
      patch.expected_text = null;
    } else if (type === 'text') {
      patch.choices_jsonb = null;
      patch.correct_jsonb = null;
      // expected_text preserved
    } else {
      patch.choices_jsonb = null;
      patch.correct_jsonb = null;
      patch.expected_text = null;
    }
    onChange(patch);
  };

  const updateChoice = (idx: number, value: string) => {
    const next = [...choices];
    next[idx] = value;
    onChange({ choices_jsonb: next });
  };

  const addChoice = () => {
    onChange({
      choices_jsonb: [...choices, `Lựa chọn ${String.fromCharCode(65 + choices.length)}`],
    });
  };

  const removeChoice = (idx: number) => {
    if (choices.length <= 2) return;
    const next = choices.filter((_, i) => i !== idx);
    const remappedCorrect = correct.filter((c) => c !== idx).map((c) => (c > idx ? c - 1 : c));
    onChange({ choices_jsonb: next, correct_jsonb: remappedCorrect });
  };

  const toggleCorrect = (idx: number) => {
    if (question.type === 'single') {
      onChange({ correct_jsonb: [idx] });
    } else {
      const next = correct.includes(idx)
        ? correct.filter((c) => c !== idx)
        : [...correct, idx].sort();
      onChange({ correct_jsonb: next });
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      {/* Header: label + move/delete controls */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary tabular-nums">
          Câu {String(index + 1).padStart(2, '0')}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="text-secondary/55 hover:text-cyan-200"
            aria-label="Lên"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="text-secondary/55 hover:text-cyan-200"
            aria-label="Xuống"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-400/70 hover:text-red-300 ml-1"
            aria-label="Xoá câu hỏi"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <textarea
        defaultValue={question.prompt_md}
        onBlur={(e) => onChange({ prompt_md: e.target.value })}
        rows={2}
        placeholder="Nội dung câu hỏi…"
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <ConfigField label="Loại">
          <CustomSelect
            value={question.type}
            onChange={(v) => setType(v as QuizQuestionType)}
            options={[
              { value: 'single', label: 'Trắc nghiệm — một đáp án' },
              { value: 'multi', label: 'Trắc nghiệm — nhiều đáp án' },
              { value: 'text', label: 'Câu trả lời tự luận (text)' },
              { value: 'file', label: 'Nộp tệp' },
              { value: 'image', label: 'Hình ảnh (đề bài có ảnh)' },
            ]}
          />
        </ConfigField>
        <ConfigField label="Điểm">
          <input
            type="number"
            min={0}
            defaultValue={question.points}
            onBlur={(e) => onChange({ points: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>
      </div>

      {(question.type === 'single' || question.type === 'multi') && (
        <ChoicesList
          choices={choices}
          correct={correct}
          onToggleCorrect={toggleCorrect}
          onUpdateChoice={updateChoice}
          onAddChoice={addChoice}
          onRemoveChoice={removeChoice}
        />
      )}

      {question.type === 'text' && (
        <ConfigField label="Đáp án mong đợi (để trống nếu giáo viên chấm tay)">
          <input
            type="text"
            defaultValue={question.expected_text ?? ''}
            onBlur={(e) => onChange({ expected_text: e.target.value.trim() || null })}
            placeholder="Ví dụ: 42  →  hệ thống tự chấm bằng cách so khớp không phân biệt hoa thường."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>
      )}

      {question.type === 'file' && (
        <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-200/85">
          Học viên sẽ nộp tệp. Câu hỏi này cần giáo viên chấm tay từ trang "Bài kiểm tra".
        </p>
      )}

      {question.type === 'image' && (
        <ImageUploader
          imageUrl={question.image_url ?? null}
          onUploaded={(url) => onChange({ image_url: url })}
        />
      )}

      <ConfigField label="Giải thích (hiển thị sau khi học viên nộp bài, tuỳ chọn)">
        <textarea
          defaultValue={question.explanation_md ?? ''}
          onBlur={(e) => onChange({ explanation_md: e.target.value.trim() || null })}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      </ConfigField>
    </div>
  );
}
