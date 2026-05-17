-- sLearningKaka — initial schema (v2: reordered for forward references)
-- Run this in Supabase SQL editor. Order matters: tables that other
-- policies reference are created first, then policies are added at the
-- bottom in a separate block.
--
-- If you've partially run an earlier version of this file, run the
-- DOWN block at the top first to wipe a clean slate.

create extension if not exists "pgcrypto";

-- =================================================================
-- TABLES
-- =================================================================

-- profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

-- courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  cover_image text,
  price_vnd integer not null default 0,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  duration_minutes integer not null default 0,
  instructor_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_status_idx on public.courses(status);
create index if not exists courses_slug_idx on public.courses(slug);

-- modules
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists modules_course_idx on public.modules(course_id, order_index);

-- lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  bunny_video_id text,
  duration_seconds integer not null default 0,
  order_index integer not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists lessons_module_idx on public.lessons(module_id, order_index);
create index if not exists lessons_course_idx on public.lessons(course_id);

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_vnd integer not null,
  payment_method text not null check (payment_method in ('vietqr_vcb', 'vietqr_momo', 'manual', 'free')),
  memo_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);

-- enrollments
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  order_id uuid references public.orders(id),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);

-- lesson_progress
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  last_position_seconds integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id, course_id);

-- flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  front_md text not null,
  back_md text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_lesson_idx on public.flashcards(lesson_id, order_index);

-- card_reviews
create table if not exists public.card_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.flashcards(id) on delete cascade,
  due_at timestamptz not null default now(),
  ease real not null default 2.5,
  interval_days integer not null default 0,
  reps integer not null default 0,
  last_reviewed_at timestamptz,
  unique (user_id, card_id)
);

create index if not exists card_reviews_user_due_idx on public.card_reviews(user_id, due_at);

-- quizzes
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt_md text not null,
  type text not null check (type in ('single', 'multi', 'text')),
  choices_jsonb jsonb,
  correct_jsonb jsonb,
  explanation_md text,
  order_index integer not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  answers_jsonb jsonb not null,
  score integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

-- =================================================================
-- TRIGGERS
-- =================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =================================================================
-- RLS — enable on every table
-- =================================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.orders enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.flashcards enable row level security;
alter table public.card_reviews enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- =================================================================
-- POLICIES
-- =================================================================

-- profiles
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- courses
drop policy if exists "courses: read published" on public.courses;
create policy "courses: read published" on public.courses for select using (status = 'published');

drop policy if exists "courses: instructor read own" on public.courses;
create policy "courses: instructor read own" on public.courses for select using (instructor_id = auth.uid());

drop policy if exists "courses: instructor write own" on public.courses;
create policy "courses: instructor write own" on public.courses for all
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- modules
drop policy if exists "modules: read if parent course is readable" on public.modules;
create policy "modules: read if parent course is readable" on public.modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and (c.status = 'published' or c.instructor_id = auth.uid())
    )
  );

drop policy if exists "modules: instructor write" on public.modules;
create policy "modules: instructor write" on public.modules for all
  using (exists (select 1 from public.courses c where c.id = modules.course_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = modules.course_id and c.instructor_id = auth.uid()));

-- lessons
drop policy if exists "lessons: read previews of published courses" on public.lessons;
create policy "lessons: read previews of published courses" on public.lessons for select
  using (
    is_preview = true
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
  );

drop policy if exists "lessons: read if enrolled" on public.lessons;
create policy "lessons: read if enrolled" on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lessons.course_id
        and e.status = 'active'
    )
  );

drop policy if exists "lessons: instructor read own" on public.lessons;
create policy "lessons: instructor read own" on public.lessons for select
  using (exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid()));

drop policy if exists "lessons: instructor write" on public.lessons;
create policy "lessons: instructor write" on public.lessons for all
  using (exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid()));

-- orders
drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders for select using (user_id = auth.uid());

drop policy if exists "orders: insert own pending" on public.orders;
create policy "orders: insert own pending" on public.orders for insert with check (user_id = auth.uid() and status = 'pending');

-- enrollments
drop policy if exists "enrollments: read own" on public.enrollments;
create policy "enrollments: read own" on public.enrollments for select using (user_id = auth.uid());

-- lesson_progress
drop policy if exists "lesson_progress: read own" on public.lesson_progress;
create policy "lesson_progress: read own" on public.lesson_progress for select using (user_id = auth.uid());

drop policy if exists "lesson_progress: write own" on public.lesson_progress;
create policy "lesson_progress: write own" on public.lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- flashcards
drop policy if exists "flashcards: read if enrolled" on public.flashcards;
create policy "flashcards: read if enrolled" on public.flashcards for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = flashcards.course_id
        and e.status = 'active'
    )
  );

-- card_reviews
drop policy if exists "card_reviews: full own" on public.card_reviews;
create policy "card_reviews: full own" on public.card_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quizzes
drop policy if exists "quizzes: read if lesson readable" on public.quizzes;
create policy "quizzes: read if lesson readable" on public.quizzes for select
  using (exists (select 1 from public.lessons l where l.id = quizzes.lesson_id));

drop policy if exists "quiz_questions: read if quiz readable" on public.quiz_questions;
create policy "quiz_questions: read if quiz readable" on public.quiz_questions for select
  using (exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id));

drop policy if exists "quiz_attempts: full own" on public.quiz_attempts;
create policy "quiz_attempts: full own" on public.quiz_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
