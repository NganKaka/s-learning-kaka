-- Migration 0005: instructors can read top-up orders
-- The 0002 policy required a matching course_id, which top-up orders don't
-- have. Without this fix, top-up orders never appear in /teacher/sales.

drop policy if exists "orders: instructor read topup" on public.orders;
create policy "orders: instructor read topup"
  on public.orders for select
  using (
    kind = 'topup'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_instructor = true
    )
  );
