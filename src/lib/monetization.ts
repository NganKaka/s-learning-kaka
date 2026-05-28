import { supabase } from './supabase';

// ---- Installment Payments ----
export interface Installment {
  id: string;
  order_id: string;
  user_id: string;
  installment_number: number;
  amount_vnd: number;
  due_date: string;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

export async function createInstallmentPlan(orderId: string, userId: string, totalAmount: number, numInstallments: number): Promise<Installment[]> {
  const perInstallment = Math.ceil(totalAmount / numInstallments);
  const installments: Array<Omit<Installment, 'id'>> = [];
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);
    installments.push({
      order_id: orderId, installment_number: i + 1, user_id: userId,
      amount_vnd: i === numInstallments - 1 ? totalAmount - perInstallment * (numInstallments - 1) : perInstallment,
      due_date: dueDate.toISOString().slice(0, 10), paid_at: null, status: 'pending',
    });
  }
  const { data } = await supabase.from('payment_installments').insert(installments).select('*');
  return (data ?? []) as Installment[];
}

export async function getMyInstallments(userId: string): Promise<Installment[]> {
  const { data } = await supabase.from('payment_installments').select('*').eq('user_id', userId).order('due_date');
  return (data ?? []) as Installment[];
}

export async function markInstallmentPaid(id: string): Promise<void> {
  await supabase.from('payment_installments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
}

// ---- Gift Cards ----
export interface GiftCard {
  id: string;
  code: string;
  course_id: string | null;
  amount_vnd: number | null;
  buyer_id: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
}

export async function createGiftCard(params: { courseId?: string; amountVnd?: number; buyerId: string }): Promise<GiftCard | null> {
  const code = `GIFT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const { data } = await supabase.from('gift_cards').insert({
    code, course_id: params.courseId ?? null, amount_vnd: params.amountVnd ?? null,
    buyer_id: params.buyerId, expires_at: expires.toISOString(),
  }).select('*').single();
  return data as GiftCard | null;
}

export async function redeemGiftCard(code: string, userId: string): Promise<{ success: boolean; giftCard?: GiftCard; error?: string }> {
  const { data } = await supabase.from('gift_cards').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (!data) return { success: false, error: 'Mã quà tặng không hợp lệ.' };
  const card = data as GiftCard;
  if (card.redeemed_by) return { success: false, error: 'Mã đã được sử dụng.' };
  if (card.expires_at && new Date(card.expires_at) < new Date()) return { success: false, error: 'Mã đã hết hạn.' };

  await supabase.from('gift_cards').update({ redeemed_by: userId, redeemed_at: new Date().toISOString() }).eq('id', card.id);

  // If course-specific, create enrollment
  if (card.course_id) {
    await supabase.from('enrollments').insert({ user_id: userId, course_id: card.course_id, status: 'active', granted_at: new Date().toISOString() });
  }
  // If amount-based, credit wallet
  if (card.amount_vnd) {
    const { data: profile } = await supabase.from('profiles').select('wallet_balance_vnd').eq('id', userId).single();
    if (profile) await supabase.from('profiles').update({ wallet_balance_vnd: (profile.wallet_balance_vnd as number) + card.amount_vnd }).eq('id', userId);
  }

  return { success: true, giftCard: { ...card, redeemed_by: userId } };
}

export async function getMyGiftCards(userId: string): Promise<GiftCard[]> {
  const { data } = await supabase.from('gift_cards').select('*').or(`buyer_id.eq.${userId},redeemed_by.eq.${userId}`).order('created_at', { ascending: false });
  return (data ?? []) as GiftCard[];
}
