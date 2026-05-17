-- sLearningKaka — initial schema
-- Run this in Supabase SQL editor (one statement at a time if it complains).
-- All tables use RLS; policies below match the access model:
--  - public: courses, modules, lessons (only is_preview), instructors
--  - authenticated user: own profile, own enrollments, own progress, own orders, own card reviews
--  - service_role: bypasses everything (used by /teacher and webhook endpoints)

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-insert profile row when a user signs up
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

-- ============================================================
-- COURSES
-- ============================================================
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

alter table public.courses enable row level security;

create policy "courses: read published"
  on public.courses for select
  using (status = 'published');

create policy "courses: instructor read own"
  on public.courses for select
  using (instructor_id = auth.uid());

create policy "courses: instructor write own"
  on public.courses for all
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- ============================================================
-- MODULES (sections inside a course)
-- ============================================================
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists modules_course_idx on public.modules(course_id, order_index);

alter table public.modules enable row level security;

create policy "modules: read if parent course is readable"
  on public.modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and (c.status = 'published' or c.instructor_id = auth.uid())
    )
  );

create policy "modules: instructor write"
  on public.modules for all
  using (
    exists (select 1 from public.courses c where c.id = modules.course_id and c.instructor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.courses c where c.id = modules.course_id and c.instructor_id = auth.uid())
  );

-- ============================================================
-- LESSONS
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  bunny_video_id text,        -- Bunny Stream video GUID
  duration_seconds integer not null default 0,
  order_index integer not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists lessons_module_idx on public.lessons(module_id, order_index);
create index if not exists lessons_course_idx on public.lessons(course_id);

alter table public.lessons enable row level security;

-- Read rules: preview lessons are public if course is published.
-- Non-preview lessons require an active enrollment.
create policy "lessons: read previews of published courses"
  on public.lessons for select
  using (
    is_preview = true
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
  );

create policy "lessons: read if enrolled"
  on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lessons.course_id
        and e.status = 'active'
    )
  );

create policy "lessons: instructor read own"
  on public.lessons for select
  using (
    exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
  );

create policy "lessons: instructor write"
  on public.lessons for all
  using (
    exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
  );

-- ============================================================
-- ORDERS (a checkout attempt; one row per attempted purchase)
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_vnd integer not null,
  payment_method text not null check (payment_method in ('vietqr_vcb', 'vietqr_momo', 'manual', 'free')),
  -- Memo string the student must include in their bank transfer so we can
  -- match the incoming payment. Generated server-side, e.g. "MATH12-AB12CD".
  memo_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),  -- which instructor approved
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);

alter table public.orders enable row level security;

create policy "orders: read own"
  on public.orders for select
  using (user_id = auth.uid());

create policy "orders: insert own pending"
  on public.orders for insert
  with check (user_id = auth.uid() and status = 'pending');

-- Approval is service_role only (instructor admin uses service_role via /api).

-- ============================================================
-- ENROLLMENTS (granted on confirmed order)
-- ============================================================
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

alter table public.enrollments enable row level security;

create policy "enrollments: read own"
  on public.enrollments for select
  using (user_id = auth.uid());

-- Inserts are service_role only (granted server-side after order confirm).

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
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

alter table public.lesson_progress enable row level security;

create policy "lesson_progress: read own"
  on public.lesson_progress for select
  using (user_id = auth.uid());

create policy "lesson_progress: write own"
  on public.lesson_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- FLASHCARDS + REVIEWS (Phase 3.1, table created early)
-- ============================================================
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

alter table public.flashcards enable row level security;

create policy "flashcards: read if enrolled"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = flashcards.course_id
        and e.status = 'active'
    )
  );

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

alter table public.card_reviews enable row level security;

create policy "card_reviews: full own"
  on public.card_reviews for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- QUIZZES (Phase 3.2, table created early)
-- ============================================================
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

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "quizzes: read if lesson readable"
  on public.quizzes for select
  using (
    exists (select 1 from public.lessons l where l.id = quizzes.lesson_id)
  );

create policy "quiz_questions: read if quiz readable"
  on public.quiz_questions for select
  using (
    exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id)
  );

create policy "quiz_attempts: full own"
  on public.quiz_attempts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
