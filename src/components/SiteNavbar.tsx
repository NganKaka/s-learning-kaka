import { Menu, X, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LiveClock from './LiveClock';

const links = [
  { label: 'Khoá học', href: '/courses' },
  { label: 'Thẻ ghi nhớ', href: '/cards' },
  { label: 'Bảng điều khiển', href: '/dashboard' },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);

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
            <ThemeToggle />
            <Link
              to="/login"
              className="bg-primary text-background px-5 py-2 rounded-lg text-xs font-bold tracking-wide border border-primary/50 shadow-[0_0_20px_rgba(233,195,73,0.6)] hover:shadow-[0_0_30px_rgba(233,195,73,1)] transition-shadow"
            >
              Đăng nhập
            </Link>
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
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest text-primary border border-primary/25 bg-primary/10"
              >
                Đăng nhập
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
