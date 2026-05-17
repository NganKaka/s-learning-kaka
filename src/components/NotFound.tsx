import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 dark:bg-[linear-gradient(rgba(233,195,73,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(233,195,73,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      {/* Floating glow */}
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]"
      />

      <div className="relative z-10 max-w-2xl text-center space-y-8">
        {/* Glitch 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          <h1 className="font-headline text-[140px] md:text-[200px] font-black leading-none tracking-tighter">
            <span className="bg-gradient-to-br from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
              404
            </span>
          </h1>
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 font-headline text-[140px] md:text-[200px] font-black leading-none tracking-tighter text-primary/20 blur-2xl"
          >
            404
          </motion.div>
        </motion.div>

        {/* Terminal-style message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0e14] font-tech text-sm shadow-xl text-left"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>
            <span className="text-[10px] text-white/40 ml-2">terminal — error</span>
          </div>
          <div className="p-4 md:p-5 space-y-1.5">
            <p>
              <span className="text-cyan-300/80">$ </span>
              <span className="text-cyan-300/80">cd </span>
              <span className="text-secondary">/page-you-requested</span>
            </p>
            <p className="text-red-400">bash: cd: /page-you-requested: No such file or directory</p>
            <p>
              <span className="text-cyan-300/80">$ </span>
              <span className="text-green-300/80">whoami</span>
            </p>
            <p className="text-secondary">user: lost in the void</p>
            <p>
              <span className="text-cyan-300/80">$ </span>
              <span className="animate-pulse text-cyan-300/80">▊</span>
            </p>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-secondary/80 text-base md:text-lg"
        >
          Looks like you've ventured into uncharted territory. The page you're looking for has either moved or never existed.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background rounded-xl text-sm font-bold tracking-wide shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] border border-primary/50 transition-shadow"
          >
            <Home size={16} />
            Back to Home
          </a>
          <a
            href="/#projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide border border-cyan-300/30 bg-cyan-950/15 text-cyan-100 hover:border-cyan-300/55 hover:bg-cyan-400/10 transition-all"
          >
            <Search size={16} />
            View Projects
          </a>
        </motion.div>
      </div>
    </div>
  );
}
