import { supabase } from './supabase';

// ---- 2FA (TOTP) Helpers ----
// Supabase Auth supports MFA natively. These are convenience wrappers.

export async function enroll2FA(): Promise<{ qrCode: string; secret: string; factorId: string } | null> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'sLearning Authenticator' });
  if (error || !data) return null;
  return { qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
}

export async function verify2FA(factorId: string, code: string): Promise<boolean> {
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
  if (!challenge) return false;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  return !error;
}

export async function unenroll2FA(factorId: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return !error;
}

export async function get2FAFactors(): Promise<Array<{ id: string; friendly_name: string; status: string }>> {
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).map((f) => ({ id: f.id, friendly_name: f.friendly_name ?? '', status: f.status }));
}

// ---- Session Management ----
export async function getActiveSessions(): Promise<Array<{ id: string; created_at: string; user_agent: string }>> {
  // Supabase doesn't expose session list directly via client SDK.
  // This is a placeholder — in production, track sessions in a custom table or use admin API.
  const { data } = await supabase.auth.getSession();
  if (!data.session) return [];
  return [{ id: data.session.access_token.slice(-8), created_at: new Date().toISOString(), user_agent: navigator.userAgent }];
}

export async function signOutAllDevices(): Promise<void> {
  await supabase.auth.signOut({ scope: 'global' });
}

// ---- Input Sanitization ----
// Simple HTML sanitizer (strips all tags except safe ones).
// For production, use DOMPurify. This is a lightweight fallback.
const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'code', 'br', 'p', 'a'];

export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.innerHTML = input;
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (!ALLOWED_TAGS.includes(el.tagName.toLowerCase())) {
          // Replace with text content
          const text = document.createTextNode(el.textContent ?? '');
          node.replaceChild(text, child);
        } else {
          // Remove dangerous attributes
          for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('on') || attr.name === 'style') el.removeAttribute(attr.name);
          }
          if (el.tagName === 'A') el.setAttribute('rel', 'noopener noreferrer');
          walk(child);
        }
      }
    }
  };
  walk(div);
  return div.innerHTML;
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
