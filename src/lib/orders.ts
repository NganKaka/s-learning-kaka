import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Order, PaymentMethod } from './database.types';

const VCB_ACCOUNT = import.meta.env.VITE_VIETQR_VCB_ACCOUNT;
const VCB_NAME = import.meta.env.VITE_VIETQR_VCB_NAME;
const MOMO_ACCOUNT = import.meta.env.VITE_VIETQR_MOMO_ACCOUNT;
const MOMO_NAME = import.meta.env.VITE_VIETQR_MOMO_NAME;

function randomMemoSuffix(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function buildMemoCode(prefix: string): string {
  const cleaned = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return `${cleaned}-${randomMemoSuffix(6)}`;
}

export interface CreatePurchaseOrderInput {
  kind: 'purchase';
  courseId: string;
  courseSlug: string;
  amountVnd: number;
  paymentMethod: PaymentMethod;
}

export interface CreateTopupOrderInput {
  kind: 'topup';
  amountVnd: number;
  paymentMethod: PaymentMethod;
}

export type CreateOrderInput = CreatePurchaseOrderInput | CreateTopupOrderInput;

export async function createOrder(input: CreateOrderInput): Promise<{ order: Order | null; error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { order: null, error: 'Bạn chưa đăng nhập.' };

  const memoPrefix = input.kind === 'topup' ? 'TOPUP' : input.courseSlug;
  const memo = buildMemoCode(memoPrefix);

  const insertPayload: Record<string, unknown> = {
    user_id: userData.user.id,
    amount_vnd: input.amountVnd,
    payment_method: input.paymentMethod,
    memo_code: memo,
    status: 'pending',
    kind: input.kind,
  };
  if (input.kind === 'purchase') {
    insertPayload.course_id = input.courseId;
  }

  const { data, error } = await supabase.from('orders').insert(insertPayload).select('*').single();
  if (error) return { order: null, error: error.message };
  return { order: data as Order, error: null };
}

/** Live-status hook: poll the order row every 5s while pending. */
export function useOrderStatus(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: number | null = null;

    const fetchOnce = async () => {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (cancelled) return;
      const o = data as Order | null;
      setOrder(o);
      if (o && o.status === 'pending') {
        timer = window.setTimeout(fetchOnce, 5000);
      }
    };
    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId]);

  return order;
}

interface VietQrUrlInput {
  bank: 'vcb' | 'momo';
  amountVnd: number;
  memo: string;
}

/**
 * Returns a VietQR.io public-API image URL with amount + memo embedded.
 * The student's banking app reads it and pre-fills everything except confirm.
 *
 * VietQR.io path:  https://img.vietqr.io/image/<bank>-<account>-<template>.jpg?amount=&addInfo=&accountName=
 *
 * For VCB: bank slug is "vcb"
 * For MoMo: VietQR doesn't natively support MoMo (it's a wallet). We fall
 * back to MoMo's own deep-link QR via momo.vn or a generic data:image with
 * the wallet phone for the student to manually transfer to. For MVP we
 * render a static "transfer to MoMo phone" card without a QR.
 */
export function buildVietQrImageUrl(input: VietQrUrlInput): string | null {
  if (input.bank === 'momo') return null;

  const account = VCB_ACCOUNT;
  const name = VCB_NAME;
  if (!account || !name) return null;

  const params = new URLSearchParams({
    amount: String(input.amountVnd),
    addInfo: input.memo,
    accountName: name,
  });
  // template "compact2" includes account info on the image
  return `https://img.vietqr.io/image/vcb-${account}-compact2.jpg?${params.toString()}`;
}

export function getBankInfo(bank: 'vcb' | 'momo'): { account: string; name: string; bankName: string } {
  if (bank === 'momo') {
    return {
      account: MOMO_ACCOUNT ?? '',
      name: MOMO_NAME ?? '',
      bankName: 'MoMo',
    };
  }
  return {
    account: VCB_ACCOUNT ?? '',
    name: VCB_NAME ?? '',
    bankName: 'Vietcombank',
  };
}
