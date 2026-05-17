import { motion } from 'framer-motion';
import { Moon, Sun, Monitor } from 'lucide-react';
import { MouseEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (event: MouseEvent<HTMLButtonElement>, value: Theme) => {
    // Capture click coordinates for circular reveal origin
    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // Use View Transitions API if available, otherwise fall back to instant
    const startViewTransition = (document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    }).startViewTransition;
    if (typeof startViewTransition === 'function') {
      const transition = startViewTransition.call(document, () => setTheme(value));

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      });
    } else {
      setTheme(value);
    }
  };

  const themes: Array<{ value: Theme; icon: typeof Sun; label: string }> = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={(e) => handleThemeChange(e, value)}
          className={`relative rounded-full p-2 transition-colors ${
            theme === value
              ? 'text-primary'
              : 'text-secondary/60 hover:text-secondary'
          }`}
          aria-label={`Switch to ${label} theme`}
          title={`${label} theme`}
        >
          {theme === value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 rounded-full bg-primary/10 border border-primary/20"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <Icon size={16} className="relative z-10" />
        </button>
      ))}
    </div>
  );
}
