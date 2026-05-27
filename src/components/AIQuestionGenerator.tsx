import { useState } from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GeneratedQuestion {
  prompt: string;
  choices: string[];
  correct: number;
  explanation: string;
}

export default function AIQuestionGenerator({ quizId, onDone }: { quizId: string; onDone: () => void }) {
  const [content, setContent] = useState('');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const generate = async () => {
    if (!content.trim()) return;
    setGenerating(true);
    setError(null);
    setQuestions([]);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), count }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setQuestions(data.questions ?? []);
    } catch (e: any) {
      setError(e.message);
    }
    setGenerating(false);
  };

  const importAll = async () => {
    setImporting(true);
    const { data: existing } = await supabase.from('quiz_questions').select('order_index').eq('quiz_id', quizId).order('order_index', { ascending: false }).limit(1);
    let idx = ((existing?.[0]?.order_index as number) ?? -1) + 1;

    for (const q of questions) {
      await supabase.from('quiz_questions').insert({
        quiz_id: quizId, prompt_md: q.prompt, type: 'single',
        choices_jsonb: q.choices, correct_jsonb: [q.correct],
        explanation_md: q.explanation || null, points: 1, order_index: idx++, tags: [],
      });
    }
    setImporting(false);
    setQuestions([]);
    onDone();
  };

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-purple-300">
        <Sparkles size={12} /> Tạo câu hỏi bằng AI
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Dán nội dung bài học vào đây… AI sẽ tạo câu hỏi trắc nghiệm từ nội dung này."
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-purple-300/40 focus:outline-none resize-y"
      />

      <div className="flex items-center gap-3">
        <label className="font-tech text-[10px] uppercase text-secondary/55">Số câu:</label>
        <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))} className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-sm text-on-surface text-center focus:border-purple-300/40 focus:outline-none" />
        <button onClick={generate} disabled={generating || !content.trim()} className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-purple-200 hover:bg-purple-500/25 disabled:opacity-50">
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Tạo
        </button>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {questions.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <p className="text-on-surface font-bold"><span className="text-purple-300 mr-1">{i + 1}.</span>{q.prompt}</p>
                <div className="mt-1 space-y-0.5">
                  {q.choices.map((c, ci) => (
                    <p key={ci} className={`text-xs ${ci === q.correct ? 'text-emerald-300' : 'text-secondary/60'}`}>
                      {String.fromCharCode(65 + ci)}. {c}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={importAll} disabled={importing} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Thêm tất cả vào quiz
          </button>
        </div>
      )}
    </div>
  );
}
