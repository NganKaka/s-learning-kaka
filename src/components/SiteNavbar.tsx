import { Menu, X, BookOpen, LogOut, LayoutDashboard, Brain, User, ChevronDown, Settings, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LiveClock from './LiveClock';
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
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-primary tracking-tighter">
              <BookOpen size={20} />
              sLearningKaka
            </Link>
            <LiveClock />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              aria-label="Mở bảng lệnh"
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55 hover:border-cyan-300/40 hover:text-cyan-200 transition-colors"
            >
              <span>Press</span>
              <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-cyan-200">⌘K</kbd>
            </button>
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
                <UserMenu
                  displayName={profile?.display_name ?? null}
                  email={user.email ?? ''}
                  avatarUrl={profile?.avatar_url ?? null}
                  isInstructor={profile?.is_instructor ?? false}
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

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden mt-4 rounded-xl border border-white/10 bg-background/90 backdrop-blur-md p-2 shadow-xl grid gap-1"
            >
              {user && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/[0.03] border border-white/10 mb-1">
                  <Avatar displayName={profile?.display_name ?? null} avatarUrl={profile?.avatar_url ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="font-headline text-sm font-bold text-on-surface truncate">
                      {profile?.display_name ?? 'Học viên'}
                    </p>
                    <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 truncate">
                      {user.email}
                    </p>
                  </div>
                  {balance !== null && (
                    <span className="font-tech text-[10px] uppercase tracking-[0.16em] text-primary tabular-nums shrink-0">
                      {formatVnd(balance)}
                    </span>
                  )}
                </div>
              )}

              {user && (
                <Link
                  to="/wallet"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-primary border border-primary/25 bg-primary/[0.06] flex items-center gap-2"
                >
                  <Wallet size={12} /> Số dư & Nạp tiền
                </Link>
              )}

              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {profile?.is_instructor && (
                <Link
                  to="/teacher"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                >
                  Teacher
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                  >
                    Tài khoản
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                    className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary border border-white/10 text-left"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-primary border border-primary/25 bg-primary/10"
                >
                  Đăng nhập
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

interface UserMenuProps {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  isInstructor: boolean;
  balanceVnd: number | null;
  onSignOut: () => void;
}

function UserMenu({ displayName, email, avatarUrl, isInstructor, balanceVnd, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 hover:border-cyan-300/40 hover:bg-cyan-400/[0.05] transition-colors"
      >
        <Avatar displayName={displayName} avatarUrl={avatarUrl} />
        <ChevronDown size={12} className={`text-secondary/60 transition-transform mr-1 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/10 bg-background/95 backdrop-blur-md shadow-[0_18px_45px_rgba(0,0,0,0.55)] overflow-hidden"
            role="menu"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Avatar displayName={displayName} avatarUrl={avatarUrl} large />
              <div className="min-w-0">
                <p className="font-headline text-sm font-bold text-on-surface truncate">
                  {displayName ?? 'Học viên'}
                </p>
                <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 truncate">
                  {email}
                </p>
                {isInstructor && (
                  <p className="mt-1 font-tech text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                    Giảng viên
                  </p>
                )}
              </div>
            </div>

            {balanceVnd !== null && (
              <Link
                to="/wallet"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 hover:bg-primary/[0.06] transition-colors"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Wallet size={13} />
                  <span className="font-tech text-[10px] uppercase tracking-[0.16em]">Số dư</span>
                </div>
                <span className="font-headline font-bold text-on-surface tabular-nums">
                  {formatVnd(balanceVnd)}
                </span>
              </Link>
            )}

            <div className="py-1">
              <MenuItem to="/dashboard" icon={LayoutDashboard} label="Bảng điều khiển" onClose={() => setOpen(false)} />
              <MenuItem to="/cards" icon={Brain} label="Thẻ ghi nhớ" onClose={() => setOpen(false)} />
              <MenuItem to="/wallet" icon={Wallet} label="Nạp tiền" onClose={() => setOpen(false)} />
              <MenuItem to="/account" icon={Settings} label="Tài khoản" onClose={() => setOpen(false)} />
              {isInstructor && (
                <MenuItem to="/teacher" icon={LayoutDashboard} label="Teacher" onClose={() => setOpen(false)} accent />
              )}
            </div>

            <div className="border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary hover:bg-white/[0.04] transition-colors"
                role="menuitem"
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  to,
  icon: Icon,
  label,
  onClose,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClose: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClose}
      role="menuitem"
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
        accent ? 'text-cyan-300 hover:bg-cyan-400/10' : 'text-on-surface hover:bg-white/[0.04]'
      }`}
    >
      <Icon size={14} />
      {label}
    </Link>
  );
}

function Avatar({
  displayName,
  avatarUrl,
  large,
}: {
  displayName: string | null;
  avatarUrl: string | null;
  large?: boolean;
}) {
  const size = large ? 36 : 28;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rounded-full border border-cyan-300/30 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials =
    (displayName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-primary/30 to-cyan-400/20 font-headline font-bold text-on-surface"
      style={{ width: size, height: size, fontSize: large ? 13 : 11 }}
    >
      {initials || <User size={14} />}
    </span>
  );
}
