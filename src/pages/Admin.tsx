import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Users, Settings, Link2, BarChart3 } from 'lucide-react';
import PageShell from '../components/PageShell';
import AdminAnalytics from '../components/AdminAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { TabBtn, RoleManager, ConfigManager, ParentLinker } from '../components/admin';

export default function Admin() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<'roles' | 'config' | 'parents' | 'analytics'>('roles');

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
          <TabBtn active={tab === 'parents'} onClick={() => setTab('parents')} icon={<Link2 size={11} />} label="Gán phụ huynh" />
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={<BarChart3 size={11} />} label="Thống kê" />
        </div>

        {tab === 'roles' && <RoleManager />}
        {tab === 'config' && <ConfigManager userId={user.id} />}
        {tab === 'parents' && <ParentLinker />}
        {tab === 'analytics' && <AdminAnalytics />}
      </div>
    </PageShell>
  );
}
