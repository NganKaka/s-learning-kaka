-- 0014_student_parent_features.sql
--
-- Schema for: mistake notebook, study sessions/time tracker, badges,
-- study goals/planner, lesson notes, activity log, parent notifications.

-- =================================================================
-- MISTAKE NOTEBOOK
-- =================================================================
create table if not exists public.mistake_notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  wrong_answer jsonb not null,        -- the AnswerValue they gave
  correct_answer jsonb not null,      -- the correct AnswerValue
  student_note text,                  -- student's own note about the mistake
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists mistake_notebook_user_idx on public.mistake_notebook(user_id, created_at desc);
create unique index if not exists mistake_notebook_uniq on public.mistake_notebook(user_id, question_id);

alter table public.mistake_notebook enable row level security;
drop policy if exists "mistake_notebook: own all" on public.mistake_notebook;
create policy "mistake_notebook: own all" on public.mistake_notebook for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- STUDY SESSIONS (time tracker)
-- =================================================================
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  activity_type text not null,  -- 'video' | 'quiz' | 'flashcard' | 'drill' | 'notes'
  duration_seconds integer not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, date desc);

alter table public.study_sessions enable row level security;
drop policy if exists "study_sessions: own all" on public.study_sessions;
create policy "study_sessions: own all" on public.study_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Parent can read linked student's sessions
drop policy if exists "study_sessions: parent read" on public.study_sessions;
create policy "study_sessions: parent read" on public.study_sessions for select
  using (
    exists (
      select 1 from public.parent_links pl
      join public.enrollments e on e.id = pl.enrollment_id
      where pl.parent_id = auth.uid()
        and e.user_id = study_sessions.user_id
        and e.course_id = study_sessions.course_id
    )
  );

-- =================================================================
-- BADGES
-- =================================================================
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,       -- 'first_perfect_quiz' | 'streak_7' | 'module_complete' | etc.
  label text not null,
  description text,
  icon text,                     -- emoji or icon name
  earned_at timestamptz not null default now()
);

create unique index if not exists badges_user_key_uniq on public.badges(user_id, badge_key);
create index if not exists badges_user_idx on public.badges(user_id, earned_at desc);

alter table public.badges enable row level security;
drop policy if exists "badges: own read" on public.badges;
create policy "badges: own read" on public.badges for select using (user_id = auth.uid());
drop policy if exists "badges: own insert" on public.badges;
create policy "badges: own insert" on public.badges for insert with check (user_id = auth.uid());

-- Parent can see linked student's badges
drop policy if exists "badges: parent read" on public.badges;
create policy "badges: parent read" on public.badges for select
  using (
    exists (
      select 1 from public.parent_links pl
      join public.enrollments e on e.id = pl.enrollment_id
      where pl.parent_id = auth.uid() and e.user_id = badges.user_id
    )
  );

-- =================================================================
-- STUDY GOALS (planner)
-- =================================================================
create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,                -- Monday of the week
  lessons_target integer not null default 3,
  flashcards_target integer not null default 50,
  quizzes_target integer not null default 2,
  lessons_done integer not null default 0,
  flashcards_done integer not null default 0,
  quizzes_done integer not null default 0,
  met boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists study_goals_user_week_uniq on public.study_goals(user_id, week_start);

alter table public.study_goals enable row level security;
drop policy if exists "study_goals: own all" on public.study_goals;
create policy "study_goals: own all" on public.study_goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Parent can see linked student's goals
drop policy if exists "study_goals: parent read" on public.study_goals;
create policy "study_goals: parent read" on public.study_goals for select
  using (
    exists (
      select 1 from public.parent_links pl
      join public.enrollments e on e.id = pl.enrollment_id
      where pl.parent_id = auth.uid() and e.user_id = study_goals.user_id
    )
  );

-- =================================================================
-- LESSON NOTES
-- =================================================================
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  timestamp_seconds integer,     -- video timestamp (nullable for general notes)
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_notes_user_lesson_idx on public.lesson_notes(user_id, lesson_id);

alter table public.lesson_notes enable row level security;
drop policy if exists "lesson_notes: own all" on public.lesson_notes;
create policy "lesson_notes: own all" on public.lesson_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- ACTIVITY LOG (for parent visibility)
-- =================================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,          -- 'lesson_view' | 'quiz_submit' | 'flashcard_review' | 'login'
  metadata jsonb,                -- { lesson_title, score, etc. }
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_idx on public.activity_log(user_id, created_at desc);

alter table public.activity_log enable row level security;
drop policy if exists "activity_log: own all" on public.activity_log;
create policy "activity_log: own all" on public.activity_log for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Parent can read linked student's activity
drop policy if exists "activity_log: parent read" on public.activity_log;
create policy "activity_log: parent read" on public.activity_log for select
  using (
    exists (
      select 1 from public.parent_links pl
      join public.enrollments e on e.id = pl.enrollment_id
      where pl.parent_id = auth.uid() and e.user_id = activity_log.user_id
    )
  );

-- =================================================================
-- PARENT NOTIFICATION PREFERENCES
-- =================================================================
alter table public.parent_links
  add column if not exists notify_email boolean not null default true,
  add column if not exists parent_email text;
