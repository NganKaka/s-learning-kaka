-- 0024_batch_improvements.sql

-- =================================================================
-- VIDEO POSITIONS (resume playback)
-- =================================================================
create table if not exists public.video_positions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position_seconds integer not null default 0,
  speed numeric not null default 1.0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.video_positions enable row level security;
drop policy if exists "video_positions: own all" on public.video_positions;
create policy "video_positions: own all" on public.video_positions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =================================================================
-- LESSON ATTACHMENTS
-- =================================================================
create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer not null default 0,
  content_type text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.lesson_attachments enable row level security;
drop policy if exists "lesson_attachments: read enrolled" on public.lesson_attachments;
create policy "lesson_attachments: read enrolled" on public.lesson_attachments for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_attachments.lesson_id and (
    c.instructor_id = auth.uid() or l.is_preview = true or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = c.id and e.status = 'active')
  ))
);
drop policy if exists "lesson_attachments: instructor write" on public.lesson_attachments;
create policy "lesson_attachments: instructor write" on public.lesson_attachments for all
  using (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_attachments.lesson_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_attachments.lesson_id and c.instructor_id = auth.uid()));

-- =================================================================
-- PAYMENT INSTALLMENTS
-- =================================================================
create table if not exists public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  installment_number integer not null,
  amount_vnd integer not null,
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending', -- 'pending' | 'paid' | 'overdue'
  created_at timestamptz not null default now()
);
create index if not exists installments_user_idx on public.payment_installments(user_id, status);
alter table public.payment_installments enable row level security;
drop policy if exists "installments: own read" on public.payment_installments;
create policy "installments: own read" on public.payment_installments for select using (user_id = auth.uid());
drop policy if exists "installments: admin all" on public.payment_installments;
create policy "installments: admin all" on public.payment_installments for all using (public.is_admin_uid() or public.is_instructor_uid()) with check (public.is_admin_uid() or public.is_instructor_uid());

-- =================================================================
-- GIFT CARDS
-- =================================================================
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course_id uuid references public.courses(id) on delete set null,
  amount_vnd integer, -- null if course-specific
  buyer_id uuid references public.profiles(id),
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gift_cards enable row level security;
drop policy if exists "gift_cards: public read own" on public.gift_cards;
create policy "gift_cards: public read own" on public.gift_cards for select using (buyer_id = auth.uid() or redeemed_by = auth.uid());
drop policy if exists "gift_cards: admin all" on public.gift_cards;
create policy "gift_cards: admin all" on public.gift_cards for all using (public.is_admin_uid()) with check (public.is_admin_uid());
drop policy if exists "gift_cards: redeem" on public.gift_cards;
create policy "gift_cards: redeem" on public.gift_cards for update using (redeemed_by is null) with check (redeemed_by = auth.uid());

-- =================================================================
-- ENGAGEMENT SCORES (materialized)
-- =================================================================
create table if not exists public.engagement_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  login_frequency numeric not null default 0,
  lesson_completion_rate numeric not null default 0,
  quiz_avg_score numeric not null default 0,
  flashcard_reviews integer not null default 0,
  composite_score numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.engagement_scores enable row level security;
drop policy if exists "engagement_scores: instructor read" on public.engagement_scores;
create policy "engagement_scores: instructor read" on public.engagement_scores for select using (user_id = auth.uid() or public.is_instructor_uid() or public.is_admin_uid());

-- =================================================================
-- LIVE QUIZ SESSIONS
-- =================================================================
create table if not exists public.live_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id),
  status text not null default 'waiting', -- 'waiting' | 'active' | 'ended'
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.live_quiz_sessions enable row level security;
drop policy if exists "live_quiz_sessions: public read" on public.live_quiz_sessions;
create policy "live_quiz_sessions: public read" on public.live_quiz_sessions for select using (true);
drop policy if exists "live_quiz_sessions: instructor write" on public.live_quiz_sessions;
create policy "live_quiz_sessions: instructor write" on public.live_quiz_sessions for all using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
