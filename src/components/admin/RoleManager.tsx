/**
 * Role manager component - manages user roles (instructor, parent, admin).
 */
import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RoleToggle } from './RoleToggle';

interface UserRow {
  id: string;
  display_name: string | null;
  is_instructor: boolean;
  is_parent: boolean;
  is_admin: boolean;
}

export function RoleManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, is_instructor, is_parent, is_admin')
      .order('display_name', { ascending: true })
      .then(({ data }) => {
        setUsers((data ?? []) as UserRow[]);
        setLoading(false);
      });
  }, []);

  const toggleRole = async (
    userId: string,
    field: 'is_instructor' | 'is_parent' | 'is_admin',
    current: boolean,
  ) => {
    setSaving(userId + field);
    await supabase
      .from('profiles')
      .update({ [field]: !current })
      .eq('id', userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
    setSaving(null);
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.id.includes(search),
  );

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );

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
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                Người dùng
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">
                Giảng viên
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">
                Phụ huynh
              </th>
              <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 text-center">
                Admin
              </th>
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
