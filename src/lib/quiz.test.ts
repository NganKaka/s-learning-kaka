import { describe, it, expect } from 'vitest';
import {
  gradeAttempt,
  aggregateGrade,
  formatTimeLeft,
  type QuizQuestion,
  type QuizAttempt,
  type AnswerValue,
} from './quiz';

// Characterization tests for the pure quiz scoring/aggregation helpers.

function q(partial: Partial<QuizQuestion> & Pick<QuizQuestion, 'id' | 'type'>): QuizQuestion {
  return {
    quiz_id: 'quiz-1',
    prompt_md: '',
    choices_jsonb: null,
    correct_jsonb: null,
    expected_text: null,
    explanation_md: null,
    image_url: null,
    points: 1,
    order_index: 0,
    tags: [],
    ...partial,
  };
}

describe('gradeAttempt', () => {
  it('grades a correct single-choice question', () => {
    const questions = [q({ id: 'a', type: 'single', correct_jsonb: [1], points: 2 })];
    const answers: Record<string, AnswerValue> = { a: { kind: 'choice', choices: [1] } };
    const r = gradeAttempt(questions, answers);
    expect(r.autoGradedPoints).toBe(2);
    expect(r.autoGradedMax).toBe(2);
    expect(r.totalMax).toBe(2);
    expect(r.autoCorrectCount).toBe(1);
    expect(r.autoGradableCount).toBe(1);
    expect(r.autoGradablePct).toBe(100);
    expect(r.finalPctIfNoTeacherGrading).toBe(100);
    expect(r.perQuestion[0].isCorrect).toBe(true);
  });

  it('marks a wrong single-choice answer as incorrect with 0 points', () => {
    const questions = [q({ id: 'a', type: 'single', correct_jsonb: [1], points: 2 })];
    const r = gradeAttempt(questions, { a: { kind: 'choice', choices: [0] } });
    expect(r.autoGradedPoints).toBe(0);
    expect(r.perQuestion[0].isCorrect).toBe(false);
  });

  it('multi-choice requires the exact set regardless of order', () => {
    const questions = [q({ id: 'a', type: 'multi', correct_jsonb: [2, 0], points: 3 })];
    expect(
      gradeAttempt(questions, { a: { kind: 'choice', choices: [0, 2] } }).autoGradedPoints,
    ).toBe(3);
    // partial selection is wrong
    expect(gradeAttempt(questions, { a: { kind: 'choice', choices: [0] } }).autoGradedPoints).toBe(
      0,
    );
    // superset is wrong
    expect(
      gradeAttempt(questions, { a: { kind: 'choice', choices: [0, 1, 2] } }).autoGradedPoints,
    ).toBe(0);
  });

  it('an empty correct set is never correct', () => {
    const questions = [q({ id: 'a', type: 'single', correct_jsonb: [], points: 1 })];
    expect(
      gradeAttempt(questions, { a: { kind: 'choice', choices: [] } }).perQuestion[0].isCorrect,
    ).toBe(false);
  });

  it('auto-grades text questions case-insensitively and trimmed', () => {
    const questions = [q({ id: 'a', type: 'text', expected_text: 'Hà Nội', points: 2 })];
    expect(
      gradeAttempt(questions, { a: { kind: 'text', text: '  hà nội ' } }).autoGradedPoints,
    ).toBe(2);
    expect(gradeAttempt(questions, { a: { kind: 'text', text: 'Saigon' } }).autoGradedPoints).toBe(
      0,
    );
  });

  it('text question without expected_text is teacher-graded (not auto-gradable)', () => {
    const questions = [q({ id: 'a', type: 'text', expected_text: '', points: 5 })];
    const r = gradeAttempt(questions, { a: { kind: 'text', text: 'anything' } });
    expect(r.perQuestion[0].autoGradable).toBe(false);
    expect(r.autoGradableCount).toBe(0);
    expect(r.finalPctIfNoTeacherGrading).toBeNull();
  });

  it('file questions are always teacher-graded', () => {
    const questions = [q({ id: 'a', type: 'file', points: 4 })];
    const r = gradeAttempt(questions, { a: { kind: 'file', file_ids: ['f1'] } });
    expect(r.perQuestion[0].autoGradable).toBe(false);
    expect(r.totalMax).toBe(4);
    expect(r.autoGradedMax).toBe(0);
    expect(r.autoGradablePct).toBe(0);
    expect(r.finalPctIfNoTeacherGrading).toBeNull();
  });

  it('mixes auto and teacher-graded: final pct is null, auto pct reflects auto questions only', () => {
    const questions = [
      q({ id: 'a', type: 'single', correct_jsonb: [0], points: 2 }),
      q({ id: 'b', type: 'file', points: 2 }),
    ];
    const r = gradeAttempt(questions, {
      a: { kind: 'choice', choices: [0] },
      b: { kind: 'file', file_ids: [] },
    });
    expect(r.autoGradedPoints).toBe(2);
    expect(r.autoGradedMax).toBe(2);
    expect(r.totalMax).toBe(4);
    expect(r.autoGradablePct).toBe(100);
    expect(r.finalPctIfNoTeacherGrading).toBeNull();
  });

  it('handles a missing answer as empty/incorrect', () => {
    const questions = [q({ id: 'a', type: 'single', correct_jsonb: [1], points: 1 })];
    expect(gradeAttempt(questions, {}).perQuestion[0].isCorrect).toBe(false);
  });
});

describe('aggregateGrade', () => {
  function attempt(p: Partial<QuizAttempt>): QuizAttempt {
    return {
      id: 'x',
      user_id: 'u',
      quiz_id: 'q',
      attempt_number: 1,
      status: 'submitted',
      started_at: '',
      submitted_at: null,
      time_spent_seconds: 0,
      tab_switches: 0,
      answers_jsonb: null,
      score: 0,
      total: 0,
      auto_score: null,
      final_score: null,
      max_score: 0,
      teacher_feedback: null,
      created_at: '',
      ...p,
    };
  }

  it('returns null effective pct when there are no submitted attempts', () => {
    expect(aggregateGrade([], 'max')).toEqual({ effectivePct: null, from: 'auto', count: 0 });
    expect(aggregateGrade([attempt({ status: 'in_progress' })], 'max').effectivePct).toBeNull();
  });

  it('takes the max across attempts in max mode', () => {
    const r = aggregateGrade(
      [attempt({ auto_score: 40 }), attempt({ auto_score: 90 }), attempt({ auto_score: 70 })],
      'max',
    );
    expect(r.effectivePct).toBe(90);
    expect(r.count).toBe(3);
  });

  it('averages across attempts in mean mode', () => {
    const r = aggregateGrade([attempt({ auto_score: 50 }), attempt({ auto_score: 100 })], 'mean');
    expect(r.effectivePct).toBe(75);
  });

  it('prefers final_score over auto_score when present', () => {
    const r = aggregateGrade([attempt({ auto_score: 50, final_score: 80 })], 'max');
    expect(r.effectivePct).toBe(80);
    expect(r.from).toBe('final');
  });

  it('labels the result "auto" if any attempt still relies on auto_score', () => {
    const r = aggregateGrade([attempt({ final_score: 80 }), attempt({ auto_score: 60 })], 'max');
    expect(r.from).toBe('auto');
  });
});

describe('formatTimeLeft', () => {
  it('formats mm:ss with zero-padding', () => {
    expect(formatTimeLeft(0)).toBe('00:00');
    expect(formatTimeLeft(5)).toBe('00:05');
    expect(formatTimeLeft(65)).toBe('01:05');
    expect(formatTimeLeft(600)).toBe('10:00');
  });

  it('clamps negatives to 00:00 and floors fractional seconds', () => {
    expect(formatTimeLeft(-30)).toBe('00:00');
    expect(formatTimeLeft(9.9)).toBe('00:09');
  });
});
