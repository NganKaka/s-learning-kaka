-- 0017_admin_read_profiles.sql
--
-- Allow admins to read all profiles (needed for role management).
-- Uses SECURITY DEFINER to avoid RLS recursion (same pattern as 0006).

create or replace function public.is_admin_uid()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );
$$;

drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles for select
  using (public.is_admin_uid());
