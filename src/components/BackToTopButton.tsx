import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export default function BackToTopButton({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-8 z-[100] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-background/80 text-on-surface/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all cursor-pointer backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      aria-label="Back to top"
    >
      <ArrowUp size={18} />
    </motion.button>
  );
}
