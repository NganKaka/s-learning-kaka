import { supabase } from './supabase';

export async function generateReferralCode(userId: string): Promise<string> {
  const code = `REF-${userId.slice(0, 4).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
  await supabase.from('profiles').update({ referral_code: code }).eq('id', userId);
  return code;
}

export async function getReferralCode(userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('referral_code').eq('id', userId).single();
  return (data?.referral_code as string | null) ?? null;
}

export async function applyReferral(referredUserId: string, referralCode: string): Promise<{ success: boolean; error?: string }> {
  // Find referrer
  const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', referralCode).maybeSingle();
  if (!referrer) return { success: false, error: 'Mã giới thiệu không hợp lệ.' };
  if (referrer.id === referredUserId) return { success: false, error: 'Không thể tự giới thiệu.' };

  // Check if already referred
  const { data: existing } = await supabase.from('referrals').select('id').eq('referred_id', referredUserId).maybeSingle();
  if (existing) return { success: false, error: 'Bạn đã sử dụng mã giới thiệu.' };

  await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: referredUserId, referral_code: referralCode });
  return { success: true };
}

export async function creditReferralReward(referrerId: string, amount: number): Promise<void> {
  // Credit wallet via direct update (in production, use the wallet_credit RPC)
  const { data } = await supabase.from('profiles').select('wallet_balance_vnd').eq('id', referrerId).single();
  if (data) {
    await supabase.from('profiles').update({ wallet_balance_vnd: (data.wallet_balance_vnd as number) + amount }).eq('id', referrerId);
  }
}

export async function getMyReferrals(userId: string): Promise<Array<{ id: string; referred_id: string; reward_credited: boolean; created_at: string }>> {
  const { data } = await supabase.from('referrals').select('*').eq('referrer_id', userId).order('created_at', { ascending: false });
  return (data ?? []) as Array<{ id: string; referred_id: string; reward_credited: boolean; created_at: string }>;
}
