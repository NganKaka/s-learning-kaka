import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WalletTransaction {
  id: string;
  amount_vnd: number;
  kind: 'topup' | 'purchase' | 'refund' | 'adjustment';
  order_id: string | null;
  memo: string | null;
  balance_after_vnd: number;
  created_at: string;
}

/**
 * Live balance from the profiles row. AuthContext already pulls the profile
 * after sign-in, so we just mirror that here.
 */
export function useWalletBalance(): number | null {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    if (profile) {
      setBalance(profile.wallet_balance_vnd ?? 0);
    }
  }, [user?.id, profile?.wallet_balance_vnd]);

  return balance;
}

/** Fetch the user's transaction ledger. */
export function useWalletTransactions(refreshKey = 0): WalletTransaction[] | null {
  const { user } = useAuth();
  const [rows, setRows] = useState<WalletTransaction[] | null>(null);

  useEffect(() => {
    if (!user) {
      setRows(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) setRows((data ?? []) as WalletTransaction[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey]);

  return rows;
}
