import type { QuizQuestion } from './quiz';

/**
 * Adaptive difficulty: weight questions toward weak topics.
 * Uses tag-based accuracy from past attempts to prioritize weak areas.
 */
export function selectAdaptiveQuestions(
  questions: QuizQuestion[],
  tagAccuracy: Record<string, number>, // tag → accuracy 0-1
  count: number,
): QuizQuestion[] {
  // Score each question: lower accuracy tags = higher priority
  const scored = questions.map((q) => {
    const tags = q.tags ?? [];
    if (tags.length === 0) return { q, weight: 0.5 };
    const avgAccuracy = tags.reduce((s, t) => s + (tagAccuracy[t] ?? 0.5), 0) / tags.length;
    // Invert: weak topics get higher weight
    return { q, weight: 1 - avgAccuracy };
  });

  // Weighted random selection
  scored.sort((a, b) => b.weight - a.weight);
  // Take top-weighted with some randomness
  const pool = scored.slice(0, Math.min(scored.length, count * 2));
  const shuffled = pool.sort(() => Math.random() - 0.3);
  return shuffled.slice(0, count).map((s) => s.q);
}

/**
 * Compute tag accuracy from past answers.
 */
export function computeTagAccuracy(
  questions: QuizQuestion[],
  attempts: Array<{ answers_jsonb: Record<string, { kind: string; choices?: number[]; text?: string }> | null }>,
): Record<string, number> {
  const tagStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of attempts) {
    const answers = attempt.answers_jsonb ?? {};
    for (const q of questions) {
      if (q.tags.length === 0) continue;
      const a = answers[q.id];
      let isCorrect = false;
      if ((q.type === 'single' || q.type === 'multi') && a?.kind === 'choice') {
        const correct = [...(q.correct_jsonb ?? [])].sort();
        const got = [...(a.choices ?? [])].sort();
        isCorrect = correct.length === got.length && correct.every((v, i) => v === got[i]);
      }
      for (const tag of q.tags) {
        if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
        tagStats[tag].total++;
        if (isCorrect) tagStats[tag].correct++;
      }
    }
  }

  const result: Record<string, number> = {};
  for (const [tag, s] of Object.entries(tagStats)) {
    result[tag] = s.total > 0 ? s.correct / s.total : 0.5;
  }
  return result;
}
