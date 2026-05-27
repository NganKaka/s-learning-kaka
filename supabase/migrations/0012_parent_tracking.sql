-- 0012_parent_tracking.sql
--
-- Adds parent role support:
--   * tracking_code on enrollments (unique per enrollment, assigned by teacher)
--   * parent_links table (parent links a code once to see that student's scores)
--   * is_parent flag on profiles

-- =================================================================
-- PROFILES: parent flag
-- =================================================================
alter table public.profiles
  add column if not exists is_parent boolean not null default false;

-- =================================================================
-- ENROLLMENTS: unique tracking code (teacher assigns manually)
-- =================================================================
alter table public.enrollments
  add column if not exists tracking_code text;

create unique index if not exists enrollments_tracking_code_uniq
  on public.enrollments(tracking_code) where tracking_code is not null;

-- =================================================================
-- PARENT_LINKS: one parent can link many codes; each code linked once
-- =================================================================
create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  tracking_code text not null,
  linked_at timestamptz not null default now(),
  constraint parent_links_enrollment_uniq unique (enrollment_id)
);

create index if not exists parent_links_parent_idx on public.parent_links(parent_id);

alter table public.parent_links enable row level security;

-- Parent can read own links
drop policy if exists "parent_links: own read" on public.parent_links;
create policy "parent_links: own read" on public.parent_links for select
  using (parent_id = auth.uid());

-- Parent can insert (link a code)
drop policy if exists "parent_links: own insert" on public.parent_links;
create policy "parent_links: own insert" on public.parent_links for insert
  with check (parent_id = auth.uid());

-- Instructor can read links for their courses
drop policy if exists "parent_links: instructor read" on public.parent_links;
create policy "parent_links: instructor read" on public.parent_links for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.id = parent_links.enrollment_id
        and c.instructor_id = auth.uid()
    )
  );

-- =================================================================
-- RLS: parent can read quiz_attempts for linked enrollments
-- =================================================================
drop policy if exists "quiz_attempts: parent read linked" on public.quiz_attempts;
create policy "quiz_attempts: parent read linked" on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.parent_links pl
      join public.enrollments e on e.id = pl.enrollment_id
      join public.lessons l on l.course_id = e.course_id
      join public.quizzes q on q.lesson_id = l.id
      where pl.parent_id = auth.uid()
        and q.id = quiz_attempts.quiz_id
        and e.user_id = quiz_attempts.user_id
    )
  );
