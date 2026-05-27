import type { QuizAttempt, QuizQuestion } from './quiz';

/**
 * Select questions for a new attempt based on quiz config.
 *
 * Supports:
 *   - pool_size: randomly pick N from all questions
 *   - shuffle_questions: randomize order
 *   - retry_wrong_only: only include questions the student got wrong last time
 */
export function selectQuestions(params: {
  allQuestions: QuizQuestion[];
  poolSize: number | null;
  shuffle: boolean;
  retryWrongOnly: boolean;
  lastAttempt: QuizAttempt | null;
}): { selected: QuizQuestion[]; ids: string[] } {
  let pool = [...params.allQuestions];

  // Retry wrong only: filter to questions answered incorrectly in last attempt
  if (params.retryWrongOnly && params.lastAttempt?.answers_jsonb) {
    const answers = params.lastAttempt.answers_jsonb;
    pool = pool.filter((q) => {
      const a = answers[q.id];
      if (!a || a.kind === 'empty') return true; // unanswered = include
      if (q.type === 'single' || q.type === 'multi') {
        const correct = [...(q.correct_jsonb ?? [])].sort();
        const picked = a.kind === 'choice' ? [...a.choices].sort() : [];
        return !(correct.length === picked.length && correct.every((v, i) => v === picked[i]));
      }
      if (q.type === 'text' && q.expected_text) {
        const got = a.kind === 'text' ? a.text.trim().toLowerCase() : '';
        return got !== q.expected_text.trim().toLowerCase();
      }
      return true; // file/ungraded = include
    });
    // If all correct, fall back to full pool
    if (pool.length === 0) pool = [...params.allQuestions];
  }

  // Pool size: random subset
  if (params.poolSize && params.poolSize < pool.length) {
    pool = shuffleArray(pool).slice(0, params.poolSize);
  }

  // Shuffle
  if (params.shuffle) {
    pool = shuffleArray(pool);
  }

  return { selected: pool, ids: pool.map((q) => q.id) };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
