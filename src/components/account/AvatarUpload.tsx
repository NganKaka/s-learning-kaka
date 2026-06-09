import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Avatar from '../navbar/Avatar';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateMyProfile, uploadAvatar } from '../../lib/profile';

const MAX_DIM = 256;

/** Downscale an image file to <= MAX_DIM (square-ish) via canvas to keep
 *  storage small. Falls back to the original file on any failure. */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
  } catch {
    return file;
  }
}

/** Profile picture with upload. Single profile-write path: uploadAvatar →
 *  updateMyProfile({ avatar_url }) → refreshProfile so the navbar updates. */
export default function AvatarUpload() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file || !user) return;
    setError(null);
    setBusy(true);
    const resized = await downscale(file);
    const { url, error: upErr } = await uploadAvatar(resized, user.id);
    if (upErr || !url) {
      setBusy(false);
      setError(upErr ?? 'Tải ảnh thất bại.');
      return;
    }
    const { error: saveErr } = await updateMyProfile({ avatar_url: url });
    setBusy(false);
    if (saveErr) {
      setError(saveErr);
      return;
    }
    await refreshProfile();
    showToast('Đã cập nhật ảnh đại diện.', 'success');
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        large
      />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="sr-only"
          aria-label="Chọn ảnh đại diện"
        />
        <Button variant="ghost" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
          <Camera size={14} aria-hidden="true" /> Đổi ảnh
        </Button>
        {error && <ErrorAlert message={error} />}
      </div>
    </div>
  );
}
