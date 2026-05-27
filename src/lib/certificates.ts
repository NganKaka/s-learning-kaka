import { supabase } from './supabase';

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  verify_code: string;
  metadata: { student_name?: string; course_title?: string; score?: number; hours?: number } | null;
}

export async function issueCertificate(params: {
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  score?: number;
  hours?: number;
}): Promise<Certificate | null> {
  const verifyCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data } = await supabase.from('certificates').upsert({
    user_id: params.userId,
    course_id: params.courseId,
    verify_code: verifyCode,
    metadata: { student_name: params.studentName, course_title: params.courseTitle, score: params.score, hours: params.hours },
  }, { onConflict: 'user_id,course_id' }).select('*').single();
  return data as Certificate | null;
}

export async function verifyCertificate(code: string): Promise<Certificate | null> {
  const { data } = await supabase.from('certificates').select('*').eq('verify_code', code).maybeSingle();
  return data as Certificate | null;
}

export function getVerifyUrl(code: string): string {
  return `${window.location.origin}/verify/${code}`;
}

export function getQrDataUrl(url: string): string {
  // Use a QR API for simplicity
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}
