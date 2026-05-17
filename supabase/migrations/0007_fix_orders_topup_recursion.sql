-- Migration 0007: break mutual recursion between orders and profiles policies
-- 0005 added "orders: instructor read topup" using a subquery against
-- profiles. Combined with 0006's "profiles: instructor read students"
-- (which queries orders), PostgREST hits a mutual-recursion loop and
-- still returns 42P17 / 500 on /rest/v1/profiles and /rest/v1/orders.
--
-- Fix: route the topup policy's instructor check through the same
-- is_instructor_uid SECURITY DEFINER helper so it doesn't re-enter
-- profiles' RLS evaluation.

drop policy if exists "orders: instructor read topup" on public.orders;

create policy "orders: instructor read topup" on public.orders for select
  using (
    kind = 'topup'
    and public.is_instructor_uid(auth.uid())
  );
