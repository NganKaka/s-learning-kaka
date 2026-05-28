-- 0023_improvements.sql
--
-- Notifications, video chapters, prerequisites, course reviews, audit log,
-- leaderboard seasons, content moderation flags.

-- =================================================================
-- NOTIFICATIONS
-- =================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,  -- 'announcement' | 'quiz_graded' | 'message' | 'badge' | 'system'
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications: own all" on public.notifications;
create policy "notifications: own all" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- VIDEO CHAPTERS
-- =================================================================
create table if not exists public.video_chapters (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  start_seconds integer not null default 0,
  order_index integer not null default 0
);
create index if not exists video_chapters_lesson_idx on public.video_chapters(lesson_id, order_index);
alter table public.video_chapters enable row level security;
drop policy if exists "video_chapters: public read" on public.video_chapters;
create policy "video_chapters: public read" on public.video_chapters for select using (true);
drop policy if exists "video_chapters: instructor write" on public.video_chapters;
create policy "video_chapters: instructor write" on public.video_chapters for all
  using (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = video_chapters.lesson_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = video_chapters.lesson_id and c.instructor_id = auth.uid()));

-- =================================================================
-- PREREQUISITES
-- =================================================================
create table if not exists public.prerequisites (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  required_lesson_id uuid not null references public.lessons(id) on delete cascade,
  constraint prerequisites_no_self check (lesson_id != required_lesson_id)
);
create unique index if not exists prerequisites_uniq on public.prerequisites(lesson_id, required_lesson_id);
alter table public.prerequisites enable row level security;
drop policy if exists "prerequisites: public read" on public.prerequisites;
create policy "prerequisites: public read" on public.prerequisites for select using (true);
drop policy if exists "prerequisites: instructor write" on public.prerequisites;
create policy "prerequisites: instructor write" on public.prerequisites for all
  using (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = prerequisites.lesson_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = prerequisites.lesson_id and c.instructor_id = auth.uid()));

-- =================================================================
-- COURSE REVIEWS
-- =================================================================
create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  content text,
  instructor_reply text,
  created_at timestamptz not null default now()
);
create unique index if not exists course_reviews_user_course_uniq on public.course_reviews(user_id, course_id);
alter table public.course_reviews enable row level security;
drop policy if exists "course_reviews: public read" on public.course_reviews;
create policy "course_reviews: public read" on public.course_reviews for select using (true);
drop policy if exists "course_reviews: own insert" on public.course_reviews;
create policy "course_reviews: own insert" on public.course_reviews for insert with check (user_id = auth.uid());
drop policy if exists "course_reviews: instructor reply" on public.course_reviews;
create policy "course_reviews: instructor reply" on public.course_reviews for update
  using (exists (select 1 from public.courses c where c.id = course_reviews.course_id and c.instructor_id = auth.uid()));

-- =================================================================
-- AUDIT LOG
-- =================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id, created_at desc);
alter table public.audit_log enable row level security;
drop policy if exists "audit_log: admin read" on public.audit_log;
create policy "audit_log: admin read" on public.audit_log for select using (public.is_admin_uid());
drop policy if exists "audit_log: insert" on public.audit_log;
create policy "audit_log: insert" on public.audit_log for insert with check (true);

-- =================================================================
-- LEADERBOARD SEASONS
-- =================================================================
create table if not exists public.leaderboard_seasons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  month date not null,  -- first day of month
  rankings jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create unique index if not exists leaderboard_seasons_uniq on public.leaderboard_seasons(course_id, month);
alter table public.leaderboard_seasons enable row level security;
drop policy if exists "leaderboard_seasons: public read" on public.leaderboard_seasons;
create policy "leaderboard_seasons: public read" on public.leaderboard_seasons for select using (true);

-- =================================================================
-- CONTENT MODERATION FLAGS
-- =================================================================
create table if not exists public.content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null,  -- 'comment'
  content_id uuid not null,
  reason text,
  status text not null default 'pending',  -- 'pending' | 'resolved' | 'dismissed'
  created_at timestamptz not null default now()
);
alter table public.content_flags enable row level security;
drop policy if exists "content_flags: own insert" on public.content_flags;
create policy "content_flags: own insert" on public.content_flags for insert with check (reporter_id = auth.uid());
drop policy if exists "content_flags: admin read" on public.content_flags;
create policy "content_flags: admin read" on public.content_flags for select using (public.is_admin_uid() or public.is_instructor_uid());

-- =================================================================
-- ONBOARDING
-- =================================================================
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- =================================================================
-- ADDITIONAL INDEXES for query optimization
-- =================================================================
create index if not exists lesson_progress_user_course_idx on public.lesson_progress(user_id, course_id);
create index if not exists enrollments_user_status_idx on public.enrollments(user_id, status);
create index if not exists orders_user_status_idx on public.orders(user_id, status);
create index if not exists quiz_attempts_status_idx on public.quiz_attempts(status, submitted_at desc);
