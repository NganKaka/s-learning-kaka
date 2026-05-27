-- 0019_admin_read_enrollments.sql
--
-- Allow admins to read all enrollments and parent_links.

drop policy if exists "enrollments: admin read all" on public.enrollments;
create policy "enrollments: admin read all" on public.enrollments for select
  using (public.is_admin_uid());

drop policy if exists "enrollments: admin update" on public.enrollments;
create policy "enrollments: admin update" on public.enrollments for update
  using (public.is_admin_uid())
  with check (public.is_admin_uid());

drop policy if exists "parent_links: admin all" on public.parent_links;
create policy "parent_links: admin all" on public.parent_links for all
  using (public.is_admin_uid())
  with check (public.is_admin_uid());
