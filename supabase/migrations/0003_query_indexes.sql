-- Migration 0003: query indexes for catalog filtering
-- Run in Supabase SQL editor.
--
-- Phase 1's 0001 added courses_status_idx and courses_slug_idx already.
-- This migration adds indexes that pay off when the catalog grows past
-- a couple dozen rows: filter-by-level, filter-by-instructor, and the
-- enrollment lookup we use to compute "Đã mua" filter status.
--
-- All `if not exists` so re-running is safe.

-- Filter "show me only beginner / intermediate / advanced" for browsing
create index if not exists courses_level_published_idx
  on public.courses (level, status)
  where status = 'published';

-- Faster instructor dashboard ("my courses")
create index if not exists courses_instructor_idx
  on public.courses (instructor_id, status);

-- Lookup: "is this user enrolled in this course?" runs on every catalog
-- card hover/render and on every /learn/* hit. Already indexed via
-- enrollments_user_idx on (user_id) but pairing with course_id helps.
create index if not exists enrollments_user_course_idx
  on public.enrollments (user_id, course_id, status);

-- Daily flashcard fetch: card_reviews due_at filter per user
create index if not exists card_reviews_user_due_idx_v2
  on public.card_reviews (user_id, due_at)
  where due_at is not null;

-- Pending order list for /teacher/sales (already orders_status_idx, but
-- pairing with course_id since the policy filters by instructor's courses).
create index if not exists orders_course_status_idx
  on public.orders (course_id, status);

-- Lesson progress: per-user per-course rollup for the dashboard streak +
-- progress bars
create index if not exists lesson_progress_user_course_idx
  on public.lesson_progress (user_id, course_id, completed_at);
