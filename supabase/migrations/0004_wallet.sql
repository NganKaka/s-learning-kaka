-- Migration 0004: wallet & top-up
-- Add wallet balance to profiles + a transactions ledger.
-- Orders gain a new payment_method 'wallet' and a new kind for top-ups.

alter table public.profiles
  add column if not exists wallet_balance_vnd integer not null default 0
    check (wallet_balance_vnd >= 0);

-- Allow new payment methods on orders. Keep the table-level check loose;
-- the kind enum below catches what kind of order it is.
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('vietqr_vcb', 'vietqr_momo', 'manual', 'free', 'wallet'));

-- Distinguish course purchase vs wallet top-up orders. Existing rows = 'purchase'.
alter table public.orders
  add column if not exists kind text not null default 'purchase'
    check (kind in ('purchase', 'topup'));

-- For top-up orders the course_id is irrelevant. Make it nullable.
alter table public.orders alter column course_id drop not null;

-- ===========================================================
-- WALLET TRANSACTIONS LEDGER
-- ===========================================================
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_vnd integer not null,         -- signed: + topup, - purchase
  kind text not null check (kind in ('topup', 'purchase', 'refund', 'adjustment')),
  order_id uuid references public.orders(id),
  memo text,
  balance_after_vnd integer not null,
  created_at timestamptz not null default now()
);

create index if not exists wallet_tx_user_idx on public.wallet_transactions (user_id, created_at desc);
create index if not exists wallet_tx_order_idx on public.wallet_transactions (order_id);

alter table public.wallet_transactions enable row level security;

drop policy if exists "wallet_tx: read own" on public.wallet_transactions;
create policy "wallet_tx: read own" on public.wallet_transactions for select using (user_id = auth.uid());

-- Inserts always go through the service-role API for atomic balance update.

-- ===========================================================
-- Atomic credit/debit functions, callable via supabase.rpc
-- ===========================================================
create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_order_id uuid,
  p_memo text
) returns integer
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
  set wallet_balance_vnd = wallet_balance_vnd + p_amount
  where id = p_user_id
  returning wallet_balance_vnd into v_new_balance;

  if v_new_balance is null then
    raise exception 'profile not found';
  end if;

  insert into public.wallet_transactions (user_id, amount_vnd, kind, order_id, memo, balance_after_vnd)
  values (p_user_id, p_amount, p_kind, p_order_id, p_memo, v_new_balance);

  return v_new_balance;
end;
$$;

create or replace function public.wallet_debit(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_order_id uuid,
  p_memo text
) returns integer
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
  set wallet_balance_vnd = wallet_balance_vnd - p_amount
  where id = p_user_id
    and wallet_balance_vnd >= p_amount
  returning wallet_balance_vnd into v_new_balance;

  if v_new_balance is null then
    raise exception 'insufficient balance';
  end if;

  insert into public.wallet_transactions (user_id, amount_vnd, kind, order_id, memo, balance_after_vnd)
  values (p_user_id, -p_amount, p_kind, p_order_id, p_memo, v_new_balance);

  return v_new_balance;
end;
$$;

-- Don't expose these to anon — only the service-role key (used by the
-- /api/orders/approve and /api/checkout/wallet functions) should call them.
revoke execute on function public.wallet_credit from anon, authenticated;
revoke execute on function public.wallet_debit from anon, authenticated;
