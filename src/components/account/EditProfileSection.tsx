import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateMyProfile } from '../../lib/profile';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';

/** Edit own display name + phone. Persists, then refreshes the profile so the
 *  navbar updates without a full reload. */
export default function EditProfileSection() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== (profile?.display_name ?? '') || phone !== (profile?.phone ?? '');

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Tên hiển thị không được để trống.');
      return;
    }
    if (phone.trim() && !/^[0-9+\s().-]{6,20}$/.test(phone.trim())) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }
    setSaving(true);
    const { error: err } = await updateMyProfile({
      display_name: name.trim(),
      phone: phone.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    await refreshProfile();
    showToast('Đã lưu hồ sơ.', 'success');
  };

  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Hồ sơ</p>

      <div className="space-y-1.5">
        <label
          htmlFor="acct-name"
          className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55"
        >
          Tên hiển thị
        </label>
        <input
          id="acct-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="acct-phone"
          className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55"
        >
          Số điện thoại
        </label>
        <input
          id="acct-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tuỳ chọn"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface placeholder:text-secondary/40 focus:border-cyan-300/40 focus:outline-none"
        />
      </div>

      {error && <ErrorAlert message={error} />}

      <Button size="sm" loading={saving} disabled={!dirty} onClick={handleSave}>
        Lưu thay đổi
      </Button>
    </section>
  );
}
