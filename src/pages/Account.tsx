import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import Avatar from '../components/navbar/Avatar';
import EditProfileSection from '../components/account/EditProfileSection';
import AccountInfoPanel from '../components/account/AccountInfoPanel';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export default function Account() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/account" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Account"
        title="Tài khoản"
        subtitle="Hồ sơ, lịch sử mua khoá học, quản lý tài khoản — tất cả ở đây."
      />

      {/* Header: avatar + name/email */}
      <div className="mt-10 flex items-center gap-4">
        <Avatar
          displayName={profile?.display_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          large
        />
        <div className="min-w-0">
          <p className="font-headline text-lg font-bold text-on-surface truncate">
            {profile?.display_name ?? 'Học viên'}
          </p>
          <p className="text-sm text-secondary/60 truncate">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <EditProfileSection />
        <AccountInfoPanel />
      </div>

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut size={14} aria-hidden="true" /> Đăng xuất
        </Button>
      </div>
    </PageShell>
  );
}
