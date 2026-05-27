-- 0022_messages_search.sql
--
-- Messages table for student-teacher DMs + full-text search indexes.

-- =================================================================
-- MESSAGES
-- =================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

alter table public.messages enable row level security;
drop policy if exists "messages: own read" on public.messages;
create policy "messages: own read" on public.messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "messages: own insert" on public.messages;
create policy "messages: own insert" on public.messages for insert with check (sender_id = auth.uid());
drop policy if exists "messages: mark read" on public.messages;
create policy "messages: mark read" on public.messages for update using (recipient_id = auth.uid());

-- =================================================================
-- FULL-TEXT SEARCH INDEXES
-- =================================================================
-- Lessons
alter table public.lessons add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))) stored;
create index if not exists lessons_fts_idx on public.lessons using gin(fts);

-- Flashcards
alter table public.flashcards add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(front_md, '') || ' ' || coalesce(back_md, ''))) stored;
create index if not exists flashcards_fts_idx on public.flashcards using gin(fts);

-- Quiz questions
alter table public.quiz_questions add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(prompt_md, ''))) stored;
create index if not exists quiz_questions_fts_idx on public.quiz_questions using gin(fts);
