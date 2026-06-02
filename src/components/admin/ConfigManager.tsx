/**
 * Config manager component - manages site configuration.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cacheInvalidate, CACHE_KEYS } from '../../lib/cache';
import { toISODate } from '../../lib/date';
import { ConfigInput } from './ConfigInput';

interface ConfigEntry {
  key: string;
  value: unknown;
}

interface ConfigManagerProps {
  userId: string;
}

const CONFIG_LABELS: Record<string, string> = {
  platform_name: 'Tên nền tảng',
  maintenance_mode: 'Chế độ bảo trì',
  allow_registration: 'Cho phép đăng ký',
  allow_google_oauth: 'Cho phép Google OAuth',
  max_upload_mb: 'Giới hạn upload (MB)',
  default_max_attempts: 'Số lượt quiz mặc định',
  welcome_email_enabled: 'Gửi email chào mừng',
  weekly_report_enabled: 'Gửi báo cáo tuần',
};

export function ConfigManager({ userId }: ConfigManagerProps) {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('site_config')
      .select('key, value')
      .order('key')
      .then(({ data }) => {
        setConfigs((data ?? []) as ConfigEntry[]);
        setLoading(false);
      });
  }, []);

  const updateConfig = (key: string, value: unknown) => {
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const c of configs) {
      await supabase
        .from('site_config')
        .update({ value: c.value, updated_at: toISODate(), updated_by: userId })
        .eq('key', c.key);
    }
    await cacheInvalidate(CACHE_KEYS.siteConfig());
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="space-y-3">
        {configs.map((c) => (
          <div
            key={c.key}
            className="flex items-center justify-between gap-4 py-2 border-b border-white/5"
          >
            <div>
              <p className="text-sm text-on-surface">{CONFIG_LABELS[c.key] ?? c.key}</p>
              <p className="font-tech text-[9px] text-secondary/40">{c.key}</p>
            </div>
            <ConfigInput value={c.value} onChange={(v) => updateConfig(c.key, v)} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={saveAll}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-50"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        Lưu tất cả
      </button>
    </div>
  );
}
