import { supabase } from './supabase';

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_order_vnd: number;
  expires_at: string | null;
  is_active: boolean;
}

export async function validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; coupon?: Coupon; discount?: number; error?: string }> {
  const { data } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
  if (!data) return { valid: false, error: 'Mã không hợp lệ.' };
  const coupon = data as Coupon;
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { valid: false, error: 'Mã đã hết hạn.' };
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return { valid: false, error: 'Mã đã hết lượt sử dụng.' };
  if (orderAmount < coupon.min_order_vnd) return { valid: false, error: `Đơn tối thiểu ${coupon.min_order_vnd.toLocaleString()}đ.` };
  const discount = coupon.discount_type === 'percent' ? Math.round(orderAmount * coupon.discount_value / 100) : coupon.discount_value;
  return { valid: true, coupon, discount: Math.min(discount, orderAmount) };
}

export async function useCoupon(couponId: string): Promise<void> {
  const { data } = await supabase.from('coupons').select('used_count').eq('id', couponId).single();
  if (data) await supabase.from('coupons').update({ used_count: (data.used_count as number) + 1 }).eq('id', couponId);
}
