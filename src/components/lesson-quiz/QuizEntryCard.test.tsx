import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Quiz, QuizAttempt, QuizQuestion } from '../../lib/quiz';

// Mock only the async data loaders; keep aggregateGrade/formatTimeLeft real.
vi.mock('../../lib/quiz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/quiz')>();
  return { ...actual, loadQuizForLesson: vi.fn(), listUserAttempts: vi.fn() };
});

import { loadQuizForLesson, listUserAttempts } from '../../lib/quiz';
import QuizEntryCard from './QuizEntryCard';

const mockLoad = vi.mocked(loadQuizForLesson);
const mockAttempts = vi.mocked(listUserAttempts);

const quiz = (maxAttempts: number): Quiz =>
  ({
    id: 'q1',
    lesson_id: 'l1',
    title: 'Kiểm tra',
    time_limit_seconds: 900,
    max_attempts: maxAttempts,
    grading_mode: 'max',
    pass_threshold: null,
    created_at: '2026-01-01T00:00:00Z',
  }) as Quiz;

const question = (i: number) => ({ id: `q-${i}` }) as unknown as QuizQuestion;

function renderCard() {
  return render(
    <MemoryRouter>
      <QuizEntryCard lessonId="l1" userId="u1" courseSlug="c" lessonSlug="l" />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('QuizEntryCard', () => {
  it('renders nothing when the lesson has no quiz', async () => {
    mockLoad.mockResolvedValue({ quiz: null, questions: [] });
    const { container } = renderCard();
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('section')).toBeNull());
  });

  it('shows start CTA linking to the quiz route when attempts remain', async () => {
    mockLoad.mockResolvedValue({ quiz: quiz(3), questions: [question(1), question(2)] });
    mockAttempts.mockResolvedValue([]);
    renderCard();
    const link = await screen.findByRole('link', { name: /Bắt đầu làm bài/i });
    expect(link).toHaveAttribute('href', '/learn/c/l/quiz');
    expect(screen.getByText(/2 câu hỏi/)).toBeInTheDocument();
  });

  it('shows review CTA when attempts are exhausted', async () => {
    mockLoad.mockResolvedValue({ quiz: quiz(2), questions: [question(1)] });
    mockAttempts.mockResolvedValue([
      { attempt_number: 1, status: 'submitted', auto_score: 80, final_score: null } as QuizAttempt,
      { attempt_number: 2, status: 'submitted', auto_score: 90, final_score: null } as QuizAttempt,
    ]);
    renderCard();
    const link = await screen.findByRole('link', { name: /Xem lại kết quả/i });
    expect(link).toHaveAttribute('href', '/learn/c/l/quiz');
  });
});
