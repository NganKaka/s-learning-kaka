import { useState } from 'react';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Bulk import questions from CSV.
 * Format: prompt | type | choices (pipe-separated) | correct (comma-separated indices) | points | tags (comma-separated)
 */
export default function BulkQuestionImport({ quizId, onDone }: { quizId: string; onDone: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const handleFile = async (file: File) => {
    setImporting(true);
    setResult(null);
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    let success = 0;
    let errors = 0;
    // Skip header if first line contains "prompt"
    const start = lines[0]?.toLowerCase().includes('prompt') ? 1 : 0;

    const { data: existing } = await supabase.from('quiz_questions').select('order_index').eq('quiz_id', quizId).order('order_index', { ascending: false }).limit(1);
    let orderIdx = (existing?.[0]?.order_index ?? -1) + 1;

    for (let i = start; i < lines.length; i++) {
      const cols = lines[i].split('|').map((c) => c.trim());
      if (cols.length < 4) { errors++; continue; }
      const [prompt, type, choicesRaw, correctRaw, pointsRaw, tagsRaw] = cols;
      const choices = type === 'single' || type === 'multi' ? choicesRaw.split(';').map((c) => c.trim()).filter(Boolean) : null;
      const correct = correctRaw ? correctRaw.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n)) : null;
      const points = parseInt(pointsRaw ?? '1', 10) || 1;
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

      const { error } = await supabase.from('quiz_questions').insert({
        quiz_id: quizId, prompt_md: prompt, type: type || 'single',
        choices_jsonb: choices, correct_jsonb: correct,
        points, tags, order_index: orderIdx++, expected_text: null, explanation_md: null,
      });
      if (error) errors++; else success++;
    }
    setResult({ success, errors });
    setImporting(false);
    if (success > 0) onDone();
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center hover:border-cyan-300/30 transition-colors cursor-pointer">
        <input type="file" accept=".csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        {importing ? <Loader2 size={20} className="mx-auto animate-spin text-cyan-300" /> : <Upload size={20} className="mx-auto text-cyan-300/80" />}
        <p className="text-sm text-secondary/75 mt-1">Tải lên CSV</p>
        <p className="font-tech text-[9px] text-secondary/45 mt-1">prompt | type | choices(;) | correct(,) | points | tags(,)</p>
      </div>
      {result && (
        <p className="inline-flex items-center gap-1.5 text-xs">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-emerald-300">{result.success} imported</span>
          {result.errors > 0 && <span className="text-red-300">· {result.errors} errors</span>}
        </p>
      )}
    </div>
  );
}
