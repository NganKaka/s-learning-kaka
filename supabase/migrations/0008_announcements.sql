-- Migration 0008: announcements (teacher → all enrolled students)
-- Teacher posts a global note. Every authenticated student who is
-- enrolled in any of the teacher's courses can read it.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body_md text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists announcements_instructor_idx
  on public.announcements (instructor_id, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements: instructor write own" on public.announcements;
create policy "announcements: instructor write own"
  on public.announcements for all
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid() and public.is_instructor_uid(auth.uid()));

drop policy if exists "announcements: students read instructor's" on public.announcements;
create policy "announcements: students read instructor's"
  on public.announcements for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.user_id = auth.uid()
        and c.instructor_id = announcements.instructor_id
        and e.status = 'active'
    )
  );

-- Public site can also surface latest announcements (e.g. on /dashboard
-- or course pages). Allow read of all announcements from instructors
-- whose courses are published, so we don't have to maintain a duplicate
-- "public" flag. Locked-down enough for MVP.
drop policy if exists "announcements: public read of instructor with published course" on public.announcements;
create policy "announcements: public read of instructor with published course"
  on public.announcements for select
  using (
    exists (
      select 1 from public.courses c
      where c.instructor_id = announcements.instructor_id
        and c.status = 'published'
    )
  );
