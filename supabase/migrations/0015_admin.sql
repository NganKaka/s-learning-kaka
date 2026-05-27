-- 0015_admin.sql
--
-- Admin role + platform configuration table.

-- =================================================================
-- PROFILES: admin flag
-- =================================================================
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- =================================================================
-- SITE_CONFIG: key-value store for platform settings
-- =================================================================
create table if not exists public.site_config (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.site_config enable row level security;

-- Anyone can read config (public settings)
drop policy if exists "site_config: public read" on public.site_config;
create policy "site_config: public read" on public.site_config for select using (true);

-- Only admins can write
drop policy if exists "site_config: admin write" on public.site_config;
create policy "site_config: admin write" on public.site_config for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Admin RLS for profiles (admin can update any profile's roles)
drop policy if exists "profiles: admin update roles" on public.profiles;
create policy "profiles: admin update roles" on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Seed default config
insert into public.site_config (key, value) values
  ('platform_name', '"sLearning Kaka"'),
  ('maintenance_mode', 'false'),
  ('allow_registration', 'true'),
  ('allow_google_oauth', 'true'),
  ('max_upload_mb', '25'),
  ('default_max_attempts', '3'),
  ('welcome_email_enabled', 'true'),
  ('weekly_report_enabled', 'true')
on conflict (key) do nothing;
