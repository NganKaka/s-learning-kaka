import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Loader2, Save, Search, Users, Settings } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface UserRow {
  id: string;
  display_name: string | null;
  is_instructor: boolean;
  is_parent: boolean;
  is_admin: boolean;
}

interface ConfigEntry {
  key: string;
  value: unknown;
}

export default function Admin() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<'roles' | 'config'>('roles');

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!(profile as { is_admin?: boolean })?.is_admin) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/80">Bạn không có quyền truy cập trang này.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-primary" />
          <h1 className="font-headline text-2xl font-extrabold text-on-surface">Quản trị hệ thống</h1>
        </div>

        <div className="flex gap-2">
          <TabBtn active={tab === 'roles'} onClick={() => setTab('roles')} icon={<Users size={11} />} label="Phân quyền" />
          <TabBtn active={tab === 'config'} onClick={() => setTab('config')} icon={<Settings size={11} />} label="Cấu hình" />
        </div>

        {tab === 'roles' && <RoleManager />}
        {tab === 'config' && <ConfigManager userId={user.id} />}
      </div>
    </PageShell>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active ? 'bg-primary/15 text-primary border border-primary/30' : 'text-secondary/60 hover:text-cyan-200 border border-transparent'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function RoleManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, is_instructor, is_parent, is_admin')
      .order('display_name', { ascending: true })
      .then(({ data }) => { setUsers((data ?? []) as UserRow[]); setLoading(false); });
  }, []);

  const toggleRole = async (userId: string, field: 'is_instructor' | 'is_parent' | 'is_admin', current: boolean) => {
    setSaving(userId + field);
    await supabase.from('profiles').update({ [field]: !current }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, [field]: !current } : u));
    setSaving(null);
  };

  const filtered = users.filter((u) =>
    !search || (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()) || u.id.includes(search),
  );

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Search size={14} className="text-secondary/55" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc ID…"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">Người dùng</th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">Giảng viên</th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">Phụ huynh</th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">Admin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="py-2">
                  <p className="text-on-surface">{u.display_name ?? 'Chưa đặt tên'}</p>
                  <p className="font-tech text-[9px] text-secondary/40">{u.id.slice(0, 8)}…</p>
                </td>
                <td className="py-2 text-center">
                  <RoleToggle
                    active={u.is_instructor}
                    loading={saving === u.id + 'is_instructor'}
                    onClick={() => toggleRole(u.id, 'is_instructor', u.is_instructor)}
                  />
                </td>
                <td className="py-2 text-center">
                  <RoleToggle
                    active={u.is_parent}
                    loading={saving === u.id + 'is_parent'}
                    onClick={() => toggleRole(u.id, 'is_parent', u.is_parent)}
                  />
                </td>
                <td className="py-2 text-center">
                  <RoleToggle
                    active={u.is_admin}
                    loading={saving === u.id + 'is_admin'}
                    onClick={() => toggleRole(u.id, 'is_admin', u.is_admin)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-tech text-[9px] text-secondary/40">{filtered.length} người dùng</p>
    </div>
  );
}

function RoleToggle({ active, loading, onClick }: { active: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-8 h-5 rounded-full transition-colors relative ${active ? 'bg-emerald-500/40' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${active ? 'left-3.5 bg-emerald-300' : 'left-0.5 bg-secondary/50'}`} />
    </button>
  );
}

function ConfigManager({ userId }: { userId: string }) {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('site_config')
      .select('key, value')
      .order('key')
      .then(({ data }) => { setConfigs((data ?? []) as ConfigEntry[]); setLoading(false); });
  }, []);

  const updateConfig = async (key: string, value: unknown) => {
    setConfigs((prev) => prev.map((c) => c.key === key ? { ...c, value } : c));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const c of configs) {
      await supabase.from('site_config').update({ value: c.value, updated_at: new Date().toISOString(), updated_by: userId }).eq('key', c.key);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>;

  const labels: Record<string, string> = {
    platform_name: 'Tên nền tảng',
    maintenance_mode: 'Chế độ bảo trì',
    allow_registration: 'Cho phép đăng ký',
    allow_google_oauth: 'Cho phép Google OAuth',
    max_upload_mb: 'Giới hạn upload (MB)',
    default_max_attempts: 'Số lượt quiz mặc định',
    welcome_email_enabled: 'Gửi email chào mừng',
    weekly_report_enabled: 'Gửi báo cáo tuần',
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="space-y-3">
        {configs.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-4 py-2 border-b border-white/5">
            <div>
              <p className="text-sm text-on-surface">{labels[c.key] ?? c.key}</p>
              <p className="font-tech text-[9px] text-secondary/40">{c.key}</p>
            </div>
            <ConfigInput value={c.value} onChange={(v) => updateConfig(c.key, v)} />
          </div>
        ))}
      </div>

      <button
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

function ConfigInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    const bool = value === true || value === 'true';
    return (
      <button
        onClick={() => onChange(!bool)}
        className={`w-10 h-5 rounded-full transition-colors relative ${bool ? 'bg-emerald-500/40' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${bool ? 'left-5 bg-emerald-300' : 'left-0.5 bg-secondary/50'}`} />
      </button>
    );
  }

  const strVal = typeof value === 'string' ? value.replace(/^"|"$/g, '') : String(value);
  return (
    <input
      type="text"
      value={strVal}
      onChange={(e) => {
        const v = e.target.value;
        const num = Number(v);
        onChange(!isNaN(num) && v.trim() !== '' ? num : `"${v}"`);
      }}
      className="w-48 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-on-surface text-right focus:border-cyan-300/40 focus:outline-none"
    />
  );
}
