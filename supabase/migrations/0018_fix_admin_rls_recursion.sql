-- 0018_fix_admin_rls_recursion.sql
--
-- Fix admin RLS policies that were causing recursion.
-- Replaces inline subqueries with is_admin_uid() SECURITY DEFINER helper.

-- Recreate the helper in case 0017 wasn't run yet
create or replace function public.is_admin_uid()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );
$$;

-- Fix profiles admin read
drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles for select
  using (public.is_admin_uid());

-- Fix profiles admin update
drop policy if exists "profiles: admin update roles" on public.profiles;
create policy "profiles: admin update roles" on public.profiles for update
  using (public.is_admin_uid())
  with check (public.is_admin_uid());

-- Fix site_config admin write
drop policy if exists "site_config: admin write" on public.site_config;
create policy "site_config: admin write" on public.site_config for all
  using (public.is_admin_uid())
  with check (public.is_admin_uid());
