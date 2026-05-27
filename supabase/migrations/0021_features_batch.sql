-- 0021_features_batch.sql
--
-- Bookmarks, comments/discussion, exam simulations, coupons, referrals,
-- scheduled announcements, deck sharing, certificate verification.

-- =================================================================
-- BOOKMARKS
-- =================================================================
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists bookmarks_user_lesson_uniq on public.bookmarks(user_id, lesson_id);
alter table public.bookmarks enable row level security;
drop policy if exists "bookmarks: own all" on public.bookmarks;
create policy "bookmarks: own all" on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- COMMENTS (discussion per lesson)
-- =================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_lesson_idx on public.comments(lesson_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "comments: read enrolled" on public.comments;
create policy "comments: read enrolled" on public.comments for select using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = comments.lesson_id and (
      c.instructor_id = auth.uid()
      or l.is_preview = true
      or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = c.id and e.status = 'active')
    )
  )
);
drop policy if exists "comments: own insert" on public.comments;
create policy "comments: own insert" on public.comments for insert with check (user_id = auth.uid());
drop policy if exists "comments: own update" on public.comments;
create policy "comments: own update" on public.comments for update using (user_id = auth.uid());
drop policy if exists "comments: own delete" on public.comments;
create policy "comments: own delete" on public.comments for delete using (user_id = auth.uid() or public.is_instructor_uid());

-- =================================================================
-- EXAM SIMULATIONS
-- =================================================================
create table if not exists public.exam_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  question_ids uuid[] not null default '{}',
  answers_jsonb jsonb,
  score numeric,
  total_questions integer not null default 0,
  time_limit_seconds integer,
  time_spent_seconds integer not null default 0,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.exam_simulations enable row level security;
drop policy if exists "exam_simulations: own all" on public.exam_simulations;
create policy "exam_simulations: own all" on public.exam_simulations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- COUPONS
-- =================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent', -- 'percent' | 'fixed'
  discount_value integer not null,               -- percent (0-100) or VND amount
  max_uses integer,
  used_count integer not null default 0,
  min_order_vnd integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
drop policy if exists "coupons: public read active" on public.coupons;
create policy "coupons: public read active" on public.coupons for select using (is_active = true);
drop policy if exists "coupons: admin all" on public.coupons;
create policy "coupons: admin all" on public.coupons for all using (public.is_admin_uid()) with check (public.is_admin_uid());

-- =================================================================
-- REFERRALS
-- =================================================================
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  reward_credited boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists referrals_referred_uniq on public.referrals(referred_id);
alter table public.referrals enable row level security;
drop policy if exists "referrals: own read" on public.referrals;
create policy "referrals: own read" on public.referrals for select using (referrer_id = auth.uid() or referred_id = auth.uid());
drop policy if exists "referrals: insert" on public.referrals;
create policy "referrals: insert" on public.referrals for insert with check (referred_id = auth.uid());

-- Add referral_code to profiles
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_uniq on public.profiles(referral_code) where referral_code is not null;

-- =================================================================
-- SHARED DECKS
-- =================================================================
create table if not exists public.shared_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  card_ids uuid[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.shared_decks enable row level security;
drop policy if exists "shared_decks: public read" on public.shared_decks;
create policy "shared_decks: public read" on public.shared_decks for select using (is_public = true or owner_id = auth.uid());
drop policy if exists "shared_decks: own write" on public.shared_decks;
create policy "shared_decks: own write" on public.shared_decks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- =================================================================
-- SCHEDULED ANNOUNCEMENTS
-- =================================================================
alter table public.announcements add column if not exists scheduled_at timestamptz;
alter table public.announcements add column if not exists is_published boolean not null default true;

-- =================================================================
-- CERTIFICATE VERIFICATION
-- =================================================================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  verify_code text not null unique,
  metadata jsonb
);
create unique index if not exists certificates_user_course_uniq on public.certificates(user_id, course_id);
alter table public.certificates enable row level security;
drop policy if exists "certificates: public read" on public.certificates;
create policy "certificates: public read" on public.certificates for select using (true);
drop policy if exists "certificates: own insert" on public.certificates;
create policy "certificates: own insert" on public.certificates for insert with check (user_id = auth.uid());
