import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Quiz, QuizQuestion, QuizQuestionType, QuizGradingMode } from '../lib/quiz';

/**
 * Form-driven quiz editor for the teacher course editor.
 *
 * Replaces the previous `window.prompt`-driven flow. Supports:
 *   - Quiz config: title, time limit, max attempts, grading mode (max/mean), pass threshold
 *   - Questions: single / multi / text / file types, points, expected_text for auto-graded text,
 *     correct-choice picker for MCQs.
 */
export default function QuizConfigEditor({ lessonId }: { lessonId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: q } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (cancelled) return;
      if (!q) {
        setQuiz(null);
        setQuestions([]);
        setLoading(false);
        return;
      }
      const { data: qs } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', q.id)
        .order('order_index', { ascending: true });
      if (cancelled) return;
      setQuiz(q as Quiz);
      setQuestions((qs ?? []) as QuizQuestion[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, tick]);

  const createQuiz = async () => {
    setCreating(true);
    await supabase.from('quizzes').insert({
      lesson_id: lessonId,
      title: 'Kiểm tra cuối bài',
      time_limit_seconds: null,
      max_attempts: 1,
      grading_mode: 'max',
    });
    setCreating(false);
    setTick((n) => n + 1);
  };

  const deleteQuiz = async () => {
    if (!quiz) return;
    if (!window.confirm('Xoá quiz này và toàn bộ câu hỏi, bài làm?')) return;
    await supabase.from('quizzes').delete().eq('id', quiz.id);
    setTick((n) => n + 1);
  };

  const saveConfig = async (patch: Partial<Quiz>) => {
    if (!quiz) return;
    setSavingConfig(true);
    await supabase.from('quizzes').update(patch).eq('id', quiz.id);
    setQuiz({ ...quiz, ...patch });
    setSavingConfig(false);
  };

  const addQuestion = async () => {
    if (!quiz) return;
    const order = questions.length;
    const { data } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quiz.id,
        prompt_md: 'Câu hỏi mới',
        type: 'single',
        choices_jsonb: ['Lựa chọn A', 'Lựa chọn B'],
        correct_jsonb: [0],
        explanation_md: null,
        expected_text: null,
        points: 1,
        order_index: order,
      })
      .select('*')
      .single();
    if (data) setQuestions((prev) => [...prev, data as QuizQuestion]);
  };

  const updateQuestion = async (id: string, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    await supabase.from('quiz_questions').update(patch).eq('id', id);
  };

  const deleteQuestion = async (id: string) => {
    if (!window.confirm('Xoá câu hỏi này?')) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    await supabase.from('quiz_questions').delete().eq('id', id);
  };

  if (loading) {
    return <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 animate-pulse h-24" />;
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-primary">
          <Sparkles size={11} /> Chưa có quiz
        </p>
        <button
          type="button"
          onClick={createQuiz}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-60"
        >
          {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Tạo quiz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-primary">
          <Sparkles size={11} /> Quiz <span className="text-secondary/45">({questions.length} câu)</span>
        </p>
        <button onClick={deleteQuiz} className="text-red-400/70 hover:text-red-300">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Config */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <ConfigField label="Tiêu đề">
          <input
            type="text"
            defaultValue={quiz.title ?? ''}
            onBlur={(e) => saveConfig({ title: e.target.value || null })}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
          />
        </ConfigField>

        <div className="grid sm:grid-cols-2 gap-3">
          <ConfigField label="Giới hạn thời gian (phút) — để trống nếu không giới hạn">
            <input
              type="number"
              min={0}
              defaultValue={quiz.time_limit_seconds ? Math.round(quiz.time_limit_seconds / 60) : ''}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const minutes = raw === '' ? null : Math.max(0, Number(raw));
                saveConfig({
                  time_limit_seconds: minutes && minutes > 0 ? minutes * 60 : null,
                });
              }}
              placeholder="Không giới hạn"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
          </ConfigField>

          <ConfigField label="Số lượt làm tối đa">
            <input
              type="number"
              min={1}
              defaultValue={quiz.max_attempts}
              onBlur={(e) => saveConfig({ max_attempts: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
          </ConfigField>

          <ConfigField label="Cách tính điểm cuối">
            <CustomSelect
              value={quiz.grading_mode}
              onChange={(v) => saveConfig({ grading_mode: v as QuizGradingMode })}
              options={[
                { value: 'max', label: 'Điểm cao nhất giữa các lượt' },
                { value: 'mean', label: 'Điểm trung bình các lượt' },
              ]}
            />
          </ConfigField>

          <ConfigField label="Ngưỡng đậu (%) — tuỳ chọn">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={quiz.pass_threshold ?? ''}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const value = raw === '' ? null : Math.max(0, Math.min(100, Number(raw)));
                saveConfig({ pass_threshold: value });
              }}
              placeholder="Không đặt"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
          </ConfigField>
        </div>

        {savingConfig && (
          <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-300 inline-flex items-center gap-1.5">
            <Loader2 size={10} className="animate-spin" /> Đang lưu…
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <QuestionEditor
            key={q.id}
            index={idx}
            question={q}
            onChange={(patch) => updateQuestion(q.id, patch)}
            onDelete={() => deleteQuestion(q.id)}
            onMove={(dir) => {
              const swapWith = idx + dir;
              if (swapWith < 0 || swapWith >= questions.length) return;
              const a = questions[idx];
              const b = questions[swapWith];
              updateQuestion(a.id, { order_index: b.order_index });
              updateQuestion(b.id, { order_index: a.order_index });
              setQuestions((prev) => {
                const next = [...prev];
                next[idx] = { ...b, order_index: a.order_index };
                next[swapWith] = { ...a, order_index: b.order_index };
                return next;
              });
            }}
          />
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-300/30 bg-cyan-400/[0.04] px-3 py-3 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-400/[0.08]"
        >
          <Plus size={11} /> Thêm câu hỏi
        </button>
      </div>

      {/* Save / Cancel */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setSavingConfig(true); setTimeout(() => { setSavingConfig(false); setTick((n) => n + 1); }, 300); }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-emerald-200 hover:bg-emerald-500/25"
        >
          <CheckCircle2 size={12} /> Lưu quiz
        </button>
        <button
          type="button"
          onClick={() => setTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-secondary/70 hover:bg-white/[0.08]"
        >
          Huỷ thay đổi
        </button>
      </div>
    </div>
  );
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        {label}
      </label>
      {children}
    </div>
  );
}

function QuestionEditor({
  index,
  question,
  onChange,
  onDelete,
  onMove,
}: {
  index: number;
  question: QuizQuestion;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
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
    onChange({ choices_jsonb: [...choices, `Lựa chọn ${String.fromCharCode(65 + choices.length)}`] });
  };

  const removeChoice = (idx: number) => {
    if (choices.length <= 2) return;
    const next = choices.filter((_, i) => i !== idx);
    const remappedCorrect = correct
      .filter((c) => c !== idx)
      .map((c) => (c > idx ? c - 1 : c));
    onChange({ choices_jsonb: next, correct_jsonb: remappedCorrect });
  };

  const toggleCorrect = (idx: number) => {
    if (question.type === 'single') {
      onChange({ correct_jsonb: [idx] });
    } else {
      const next = correct.includes(idx) ? correct.filter((c) => c !== idx) : [...correct, idx].sort();
      onChange({ correct_jsonb: next });
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
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
                  onClick={() => toggleCorrect(ci)}
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
                  onBlur={(e) => updateChoice(ci, e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
                />
                {choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(ci)}
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
            onClick={addChoice}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[0.06] px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/[0.1]"
          >
            <Plus size={10} /> Thêm đáp án
          </button>
        </div>
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
          Học viên sẽ nộp tệp. Câu hỏi này cần giáo viên chấm tay từ trang “Bài kiểm tra”.
        </p>
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

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface hover:border-cyan-300/30 focus:border-cyan-300/40 focus:outline-none transition-colors"
      >
        <span>{selected?.label ?? '—'}</span>
        <ChevronDown size={14} className={`text-secondary/55 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-1 w-full origin-top rounded-lg border border-white/15 bg-[#0f1729]/95 backdrop-blur-md shadow-xl overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  opt.value === value
                    ? 'bg-cyan-400/10 text-cyan-200'
                    : 'text-on-surface hover:bg-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
