-- Migration 0006: fix RLS recursion on profiles
-- The 0002 "instructor read students" policy referenced public.profiles
-- inside its own using-clause via auth.uid() lookup, causing PostgREST
-- to return error 42P17 (infinite recursion in policy) on any select
-- against profiles. Symptoms: 500 from /rest/v1/profiles, navbar misses
-- is_instructor flag, /teacher hidden.
--
-- Fix: route the instructor check through a SECURITY DEFINER function
-- that bypasses RLS for the self-lookup, breaking the recursion.

drop policy if exists "profiles: instructor read students" on public.profiles;

create or replace function public.is_instructor_uid(u uuid) returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_instructor from public.profiles where id = u), false);
$$;

revoke execute on function public.is_instructor_uid(uuid) from anon, authenticated;
grant execute on function public.is_instructor_uid(uuid) to authenticated;

create policy "profiles: instructor read students" on public.profiles for select
  using (
    public.is_instructor_uid(auth.uid())
    and (
      exists (
        select 1 from public.enrollments e
        join public.courses c on c.id = e.course_id
        where e.user_id = profiles.id and c.instructor_id = auth.uid()
      )
      or exists (
        select 1 from public.orders o
        join public.courses c on c.id = o.course_id
        where o.user_id = profiles.id and c.instructor_id = auth.uid()
      )
    )
  );
