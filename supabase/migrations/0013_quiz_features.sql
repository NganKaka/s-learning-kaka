-- 0013_quiz_features.sql
--
-- Schema additions for: question bank, tags, practice mode, XP/streaks,
-- leaderboard support, retry-wrong-only.

-- =================================================================
-- QUIZ_QUESTIONS: tags for weak-topic analysis
-- =================================================================
alter table public.quiz_questions
  add column if not exists tags text[] not null default '{}';

-- =================================================================
-- QUIZZES: question pool + practice mode
-- =================================================================
alter table public.quizzes
  add column if not exists pool_size integer,          -- null = use all questions
  add column if not exists shuffle_questions boolean not null default false,
  add column if not exists is_practice boolean not null default false;

-- =================================================================
-- QUIZ_ATTEMPTS: retry-wrong-only flag + selected question ids
-- =================================================================
alter table public.quiz_attempts
  add column if not exists retry_wrong_only boolean not null default false,
  add column if not exists selected_question_ids uuid[] not null default '{}';

-- =================================================================
-- XP + STREAKS
-- =================================================================
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null,          -- 'quiz_submit' | 'flashcard_review' | 'drill_complete' | 'streak_bonus'
  xp integer not null default 0,
  reference_id uuid,             -- optional: attempt_id, etc.
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);

alter table public.xp_events enable row level security;
drop policy if exists "xp_events: own read" on public.xp_events;
create policy "xp_events: own read" on public.xp_events for select using (user_id = auth.uid());
drop policy if exists "xp_events: own insert" on public.xp_events;
create policy "xp_events: own insert" on public.xp_events for insert with check (user_id = auth.uid());

-- Streak tracking
alter table public.profiles
  add column if not exists xp_total integer not null default 0,
  add column if not exists streak_current integer not null default 0,
  add column if not exists streak_last_date date;

-- =================================================================
-- LEADERBOARD: materialized view for fast reads (refresh periodically or on demand)
-- =================================================================
drop materialized view if exists public.course_leaderboard;
create materialized view public.course_leaderboard as
select
  e.course_id,
  e.user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(
    case when qa.final_score is not null then qa.final_score
         when qa.auto_score is not null then qa.auto_score
         else 0 end
  ), 0) as total_score,
  count(distinct qa.quiz_id) as quizzes_completed,
  p.xp_total
from public.enrollments e
join public.profiles p on p.id = e.user_id
left join public.quizzes q on q.lesson_id in (
  select l.id from public.lessons l where l.course_id = e.course_id
)
left join public.quiz_attempts qa on qa.quiz_id = q.id
  and qa.user_id = e.user_id
  and qa.status in ('submitted', 'graded')
where e.status = 'active'
group by e.course_id, e.user_id, p.display_name, p.avatar_url, p.xp_total;

create unique index if not exists course_leaderboard_uniq
  on public.course_leaderboard(course_id, user_id);

-- Function to refresh leaderboard (call after quiz submission or periodically)
create or replace function public.refresh_leaderboard()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.course_leaderboard;
end;
$$;
