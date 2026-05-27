-- 0010_quiz_advanced.sql
--
-- Adds the per-lesson Quiz feature on top of the existing skeleton tables.
--
-- New capabilities:
--   * Per-quiz config: time limit, max attempts, grading aggregation (max/mean)
--   * Question types: 'single' / 'multi' / 'text' / 'file' (was missing 'file')
--   * Auto-graded text answers via expected_text (case-insensitive trim match)
--   * Per-question points
--   * Attempt metadata: started_at, submitted_at, time_spent_seconds,
--     tab_switches, attempt_number, status, auto_score, final_score, max_score,
--     teacher_feedback
--   * File submissions stored in 'quiz-submissions' bucket + manifest table
--   * Instructor-read RLS on attempts and submission files (gated by ownership
--     of the parent course)
--
-- Idempotent: every alter/create uses IF NOT EXISTS or DROP-then-CREATE.

-- =================================================================
-- QUIZZES: configuration columns
-- =================================================================
alter table public.quizzes
  add column if not exists time_limit_seconds integer,
  add column if not exists max_attempts integer not null default 1,
  add column if not exists grading_mode text not null default 'max',
  add column if not exists pass_threshold integer;

-- Re-create the grading_mode constraint so it's stable across re-runs
alter table public.quizzes
  drop constraint if exists quizzes_grading_mode_check;
alter table public.quizzes
  add constraint quizzes_grading_mode_check
  check (grading_mode in ('max', 'mean'));

-- =================================================================
-- QUIZ_QUESTIONS: allow 'file' type, add points + expected_text
-- =================================================================
alter table public.quiz_questions
  drop constraint if exists quiz_questions_type_check;
alter table public.quiz_questions
  add constraint quiz_questions_type_check
  check (type in ('single', 'multi', 'text', 'file'));

alter table public.quiz_questions
  add column if not exists points integer not null default 1,
  add column if not exists expected_text text;

-- =================================================================
-- QUIZ_ATTEMPTS: session metadata
-- =================================================================
alter table public.quiz_attempts
  add column if not exists attempt_number integer not null default 1,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists submitted_at timestamptz,
  add column if not exists time_spent_seconds integer not null default 0,
  add column if not exists tab_switches integer not null default 0,
  add column if not exists auto_score numeric,
  add column if not exists final_score numeric,
  add column if not exists max_score integer not null default 0,
  add column if not exists teacher_feedback jsonb,
  add column if not exists status text not null default 'submitted';

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_status_check;
alter table public.quiz_attempts
  add constraint quiz_attempts_status_check
  check (status in ('in_progress', 'submitted', 'graded'));

create index if not exists quiz_attempts_quiz_idx
  on public.quiz_attempts(quiz_id, submitted_at desc nulls last);
create index if not exists quiz_attempts_user_quiz_idx
  on public.quiz_attempts(user_id, quiz_id);

-- =================================================================
-- QUIZ_SUBMISSION_FILES: per-question file uploads
-- =================================================================
create table if not exists public.quiz_submission_files (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists quiz_submission_files_attempt_idx
  on public.quiz_submission_files(attempt_id);
create index if not exists quiz_submission_files_question_idx
  on public.quiz_submission_files(question_id);

alter table public.quiz_submission_files enable row level security;

-- =================================================================
-- STORAGE: private bucket for quiz uploads
-- Path convention: <user_id>/<attempt_id>/<filename>
-- =================================================================
insert into storage.buckets (id, name, public)
  values ('quiz-submissions', 'quiz-submissions', false)
  on conflict (id) do nothing;

-- =================================================================
-- RLS policies (drop + recreate so they stay current)
-- =================================================================

-- quizzes: read if instructor of course OR enrolled student OR lesson is a preview
drop policy if exists "quizzes: read if lesson readable" on public.quizzes;
drop policy if exists "quizzes: read if enrolled or instructor" on public.quizzes;
create policy "quizzes: read if enrolled or instructor" on public.quizzes for select
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = quizzes.lesson_id
        and (
          c.instructor_id = auth.uid()
          or l.is_preview = true
          or exists (
            select 1 from public.enrollments e
            where e.user_id = auth.uid()
              and e.course_id = c.id
              and e.status = 'active'
          )
        )
    )
  );

drop policy if exists "quizzes: instructor write" on public.quizzes;
create policy "quizzes: instructor write" on public.quizzes for all
  using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = quizzes.lesson_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = quizzes.lesson_id and c.instructor_id = auth.uid()
    )
  );

-- quiz_questions: same gating as quizzes
drop policy if exists "quiz_questions: read if quiz readable" on public.quiz_questions;
create policy "quiz_questions: read if quiz readable" on public.quiz_questions for select
  using (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_questions.quiz_id
        and (
          c.instructor_id = auth.uid()
          or l.is_preview = true
          or exists (
            select 1 from public.enrollments e
            where e.user_id = auth.uid()
              and e.course_id = c.id
              and e.status = 'active'
          )
        )
    )
  );

drop policy if exists "quiz_questions: instructor write" on public.quiz_questions;
create policy "quiz_questions: instructor write" on public.quiz_questions for all
  using (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_questions.quiz_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_questions.quiz_id and c.instructor_id = auth.uid()
    )
  );

-- quiz_attempts: keep "full own" + instructor SELECT/UPDATE on owned courses
-- (the existing "quiz_attempts: full own" policy from 0001_init stays in place)
drop policy if exists "quiz_attempts: instructor read" on public.quiz_attempts;
create policy "quiz_attempts: instructor read" on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_attempts.quiz_id and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "quiz_attempts: instructor grade" on public.quiz_attempts;
create policy "quiz_attempts: instructor grade" on public.quiz_attempts for update
  using (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_attempts.quiz_id and c.instructor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_attempts.quiz_id and c.instructor_id = auth.uid()
    )
  );

-- quiz_submission_files: own all + instructor read
drop policy if exists "quiz_submission_files: own all" on public.quiz_submission_files;
create policy "quiz_submission_files: own all" on public.quiz_submission_files for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "quiz_submission_files: instructor read" on public.quiz_submission_files;
create policy "quiz_submission_files: instructor read" on public.quiz_submission_files for select
  using (
    exists (
      select 1
      from public.quiz_attempts a
      join public.quizzes q on q.id = a.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where a.id = quiz_submission_files.attempt_id
        and c.instructor_id = auth.uid()
    )
  );

-- =================================================================
-- Storage policies for the 'quiz-submissions' bucket
-- =================================================================
drop policy if exists "quiz-submissions: insert by owner" on storage.objects;
create policy "quiz-submissions: insert by owner" on storage.objects
  for insert with check (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "quiz-submissions: read own" on storage.objects;
create policy "quiz-submissions: read own" on storage.objects
  for select using (
    bucket_id = 'quiz-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Instructor read: scoped to files belonging to attempts on their own courses
drop policy if exists "quiz-submissions: instructor read" on storage.objects;
create policy "quiz-submissions: instructor read" on storage.objects
  for select using (
    bucket_id = 'quiz-submissions'
    and exists (
      select 1
      from public.quiz_submission_files f
      join public.quiz_attempts a on a.id = f.attempt_id
      join public.quizzes q on q.id = a.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where f.file_path = storage.objects.name
        and c.instructor_id = auth.uid()
    )
  );
