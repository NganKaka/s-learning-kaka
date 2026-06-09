import { useEffect, useState } from 'react';
import { Plus, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cacheInvalidate, CACHE_KEYS } from '../lib/cache';
import type { Quiz, QuizQuestion } from '../lib/quiz';
import QuizMetaForm from './teacher/quiz-config/QuizMetaForm';
import QuestionEditor from './teacher/quiz-config/QuestionEditor';
import QuizEmptyState from './teacher/quiz-config/QuizEmptyState';

/**
 * Form-driven quiz editor for the teacher course editor.
 *
 * Orchestrates QuizEmptyState + QuizMetaForm + QuestionEditor sub-components.
 * Supports: title, time limit, max attempts, grading mode, pass threshold,
 * and questions of type single / multi / text / file / image.
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
    cacheInvalidate(CACHE_KEYS.quizQuestions(lessonId));
    setTick((n) => n + 1);
  };

  const deleteQuiz = async () => {
    if (!quiz) return;
    if (!window.confirm('Xoá quiz này và toàn bộ câu hỏi, bài làm?')) return;
    await supabase.from('quizzes').delete().eq('id', quiz.id);
    cacheInvalidate(CACHE_KEYS.quizQuestions(lessonId));
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
        order_index: questions.length,
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
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 animate-pulse h-24" />
    );
  }

  if (!quiz) {
    return <QuizEmptyState creating={creating} onCreate={createQuiz} />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-primary">
          <Sparkles size={11} /> Quiz{' '}
          <span className="text-secondary/45">({questions.length} câu)</span>
        </p>
        <button onClick={deleteQuiz} className="text-red-400/70 hover:text-red-300">
          <Trash2 size={12} />
        </button>
      </div>

      <QuizMetaForm quiz={quiz} saving={savingConfig} onSave={saveConfig} />

      {/* Questions list */}
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
          onClick={() => {
            setSavingConfig(true);
            setTimeout(() => {
              setSavingConfig(false);
              setTick((n) => n + 1);
            }, 300);
          }}
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
