import {
  LogOut,
  LayoutDashboard,
  Brain,
  ChevronDown,
  Settings,
  Wallet,
  Shield,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd } from '../../lib/courses';
import Avatar from './Avatar';
import MenuItem from './MenuItem';

interface UserMenuProps {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  isInstructor: boolean;
  isAdmin: boolean;
  balanceVnd: number | null;
  onSignOut: () => void;
}

/** Desktop profile dropdown: avatar trigger + menu of account links. */
export default function UserMenu({
  displayName,
  email,
  avatarUrl,
  isInstructor,
  isAdmin,
  balanceVnd,
  onSignOut,
}: UserMenuProps) {
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
        <ChevronDown
          size={12}
          className={`text-secondary/60 transition-transform mr-1 ${open ? 'rotate-180' : ''}`}
        />
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
              <MenuItem
                to="/dashboard"
                icon={LayoutDashboard}
                label="Bảng điều khiển"
                onClose={() => setOpen(false)}
              />
              <MenuItem
                to="/cards"
                icon={Brain}
                label="Thẻ ghi nhớ"
                onClose={() => setOpen(false)}
              />
              <MenuItem
                to="/wallet"
                icon={Wallet}
                label="Nạp tiền"
                onClose={() => setOpen(false)}
              />
              <MenuItem
                to="/account"
                icon={Settings}
                label="Tài khoản"
                onClose={() => setOpen(false)}
              />
              {isInstructor && (
                <MenuItem
                  to="/teacher"
                  icon={LayoutDashboard}
                  label="Teacher"
                  onClose={() => setOpen(false)}
                  accent
                />
              )}
              {isAdmin && (
                <MenuItem
                  to="/admin"
                  icon={Shield}
                  label="Admin"
                  onClose={() => setOpen(false)}
                  accent
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                }}
                className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-white/[0.04] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Settings size={14} /> Bảng lệnh
                </span>
                <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-tech text-[10px] text-cyan-200">
                  ⌘K
                </kbd>
              </button>
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
