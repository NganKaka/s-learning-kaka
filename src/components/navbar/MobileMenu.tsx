import { AnimatePresence, motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatVnd } from '../../lib/courses';
import Avatar from './Avatar';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: ReadonlyArray<{ label: string; href: string }>;
  isAuthed: boolean;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isInstructor: boolean;
  isAdmin: boolean;
  isParent: boolean;
  balance: number | null;
  onSignOut: () => void;
}

/** Collapsible mobile navigation drawer (md:hidden). */
export default function MobileMenu({
  open,
  onClose,
  links,
  isAuthed,
  email,
  displayName,
  avatarUrl,
  isInstructor,
  isAdmin,
  isParent,
  balance,
  onSignOut,
}: MobileMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="md:hidden mt-4 rounded-xl border border-white/10 bg-background/90 backdrop-blur-md p-2 shadow-xl grid gap-1"
        >
          {isAuthed && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/[0.03] border border-white/10 mb-1">
              <Avatar displayName={displayName} avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="font-headline text-sm font-bold text-on-surface truncate">
                  {displayName ?? 'Học viên'}
                </p>
                <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 truncate">
                  {email}
                </p>
              </div>
              {balance !== null && (
                <span className="font-tech text-[10px] uppercase tracking-[0.16em] text-primary tabular-nums shrink-0">
                  {formatVnd(balance)}
                </span>
              )}
            </div>
          )}

          {isAuthed && (
            <Link
              to="/wallet"
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-primary border border-primary/25 bg-primary/[0.06] flex items-center gap-2"
            >
              <Wallet size={12} /> Số dư & Nạp tiền
            </Link>
          )}

          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isInstructor && (
            <Link
              to="/teacher"
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              Teacher
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              Admin
            </Link>
          )}
          {isParent && (
            <Link
              to="/parent"
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              Phụ huynh
            </Link>
          )}
          {isAuthed ? (
            <>
              <Link
                to="/account"
                onClick={onClose}
                className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
              >
                Tài khoản
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-secondary border border-white/10 text-left"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-primary border border-primary/25 bg-primary/10"
            >
              Đăng nhập
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
