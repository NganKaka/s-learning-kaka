import { supabase } from './supabase';

/** Public storage bucket for user avatars (see migration in the profile plan). */
export const AVATAR_BUCKET = 'avatars';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ProfilePatch {
  display_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}

/**
 * Update the signed-in user's own profile row. RLS ("profiles: update own")
 * limits this to `auth.uid() = id`, so no id is accepted from the caller.
 */
export async function updateMyProfile(patch: ProfilePatch): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Bạn chưa đăng nhập.' };

  const { error } = await supabase.from('profiles').update(patch).eq('id', userData.user.id);
  return { error: error?.message ?? null };
}

/**
 * Upload an avatar image to the user's own folder in the `avatars` bucket and
 * return its public URL. Storage RLS restricts writes to `<uid>/…`. Caller then
 * persists the URL via `updateMyProfile({ avatar_url })` (single write path).
 */
export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { url: null, error: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { url: null, error: 'Ảnh quá lớn (tối đa 2 MB).' };
  }

  const ext =
    file.name
      .split('.')
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) return { url: null, error: uploadErr.message };

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
