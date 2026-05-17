-- Migration 0002: instructor visibility into orders for their courses
-- Adds two policies so the /teacher/sales admin can:
--   1. Read pending/confirmed orders belonging to courses they own
--   2. (Approval is still done via Vercel function with service_role key,
--      so no instructor UPDATE policy needed.)
-- Also: allow instructors to read profile rows for users who bought
-- their courses, so /teacher/sales can show student email + name.

drop policy if exists "orders: instructor read for own courses" on public.orders;
create policy "orders: instructor read for own courses"
  on public.orders for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = orders.course_id
        and c.instructor_id = auth.uid()
    )
  );

-- Profile read: instructor can see profiles of students enrolled in or
-- paying for their courses.
drop policy if exists "profiles: instructor read students" on public.profiles;
create policy "profiles: instructor read students"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.orders o
      join public.courses c on c.id = o.course_id
      where o.user_id = profiles.id
        and c.instructor_id = auth.uid()
    )
    or exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.user_id = profiles.id
        and c.instructor_id = auth.uid()
    )
  );
