import { Menu, X, BookOpen, LayoutDashboard, Users, Wallet, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LiveClock from './LiveClock';
import NotificationCenter from './NotificationCenter';
import UserMenu from './navbar/UserMenu';
import MobileMenu from './navbar/MobileMenu';
import { useAuth } from '../contexts/AuthContext';
import { useWalletBalance } from '../lib/wallet';
import { formatVnd } from '../lib/courses';

const links = [
  { label: 'Khoá học', href: '/courses' },
  { label: 'Thẻ ghi nhớ', href: '/cards' },
  { label: 'Bảng điều khiển', href: '/dashboard' },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const balance = useWalletBalance();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-background/60 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xl font-black text-primary tracking-tighter"
            >
              <BookOpen size={20} />
              sLearningKaka
            </Link>
            <LiveClock />
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-headline tracking-tighter uppercase text-[12px] font-bold transition-all duration-300 px-2 py-1 rounded-md text-secondary/60 hover:text-cyan-300 hover:bg-cyan-400/10"
              >
                {link.label}
              </Link>
            ))}
            {profile?.is_instructor && (
              <Link
                to="/teacher"
                className="font-headline tracking-tighter uppercase text-[12px] font-bold text-cyan-300 hover:text-cyan-200 px-2 py-1 rounded-md hover:bg-cyan-400/10 transition-colors inline-flex items-center gap-1.5"
              >
                <LayoutDashboard size={12} /> Teacher
              </Link>
            )}
            {profile?.is_admin && (
              <Link
                to="/admin"
                className="font-headline tracking-tighter uppercase text-[12px] font-bold text-amber-300 hover:text-amber-200 px-2 py-1 rounded-md hover:bg-amber-400/10 transition-colors inline-flex items-center gap-1.5"
              >
                <Shield size={12} /> Admin
              </Link>
            )}
            {profile?.is_parent && (
              <Link
                to="/parent"
                className="font-headline tracking-tighter uppercase text-[12px] font-bold text-emerald-300 hover:text-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-400/10 transition-colors inline-flex items-center gap-1.5"
              >
                <Users size={12} /> Phụ huynh
              </Link>
            )}
            <ThemeToggle />
            {user ? (
              <>
                {balance !== null && (
                  <Link
                    to="/wallet"
                    className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:bg-primary/15 transition-colors"
                  >
                    <Wallet size={12} />
                    <span className="tabular-nums">{formatVnd(balance)}</span>
                  </Link>
                )}
                <NotificationCenter userId={user.id} />
                <UserMenu
                  displayName={profile?.display_name ?? null}
                  email={user.email ?? ''}
                  avatarUrl={profile?.avatar_url ?? null}
                  isInstructor={profile?.is_instructor ?? false}
                  isAdmin={profile?.is_admin ?? false}
                  balanceVnd={balance}
                  onSignOut={handleSignOut}
                />
              </>
            ) : (
              <Link
                to="/login"
                className="bg-primary text-background px-5 py-2 rounded-lg text-xs font-bold tracking-wide border border-primary/50 shadow-[0_0_20px_rgba(233,195,73,0.6)] hover:shadow-[0_0_30px_rgba(233,195,73,1)] transition-shadow"
              >
                Đăng nhập
              </Link>
            )}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-primary/10 border border-white/10 hover:border-primary/30 transition-all"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        <MobileMenu
          open={open}
          onClose={() => setOpen(false)}
          links={links}
          isAuthed={!!user}
          email={user?.email ?? null}
          displayName={profile?.display_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          isInstructor={profile?.is_instructor ?? false}
          isAdmin={profile?.is_admin ?? false}
          isParent={profile?.is_parent ?? false}
          balance={balance}
          onSignOut={handleSignOut}
        />
      </div>
    </nav>
  );
}
