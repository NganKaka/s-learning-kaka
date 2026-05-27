-- 0020_parent_read_enrollments.sql
--
-- Allow parents to read enrollments they are linked to.

drop policy if exists "enrollments: parent read linked" on public.enrollments;
create policy "enrollments: parent read linked" on public.enrollments for select
  using (
    exists (
      select 1 from public.parent_links pl
      where pl.parent_id = auth.uid()
        and pl.enrollment_id = enrollments.id
    )
  );
