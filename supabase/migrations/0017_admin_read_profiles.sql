-- 0017_admin_read_profiles.sql
--
-- Allow admins to read all profiles (needed for role management).

drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
