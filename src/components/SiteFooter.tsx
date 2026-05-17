import { motion } from 'framer-motion';
import { Github, Mail, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="w-full bg-background border-t border-white/10 pt-16 pb-12 px-6 md:px-12 mt-8 relative z-50">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.32em]"
        >
          <span className="block h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
          <span className="text-primary/85">sLearningKaka</span>
          <span className="block h-px w-12 bg-gradient-to-l from-transparent to-cyan-300/50" />
        </motion.div>

        <h3 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
          <span className="italic font-light text-secondary/85">Học để</span>{' '}
          <span className="text-primary">làm được</span>
          <span className="text-secondary/85">.</span>
        </h3>

        <div className="flex flex-wrap justify-center gap-4 text-secondary/80">
          <Link to="/courses" className="text-sm hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5">
            <BookOpen size={14} /> Khoá học
          </Link>
          <a href="https://github.com/NganKaka" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5">
            <Github size={14} /> GitHub
          </a>
          <a href="mailto:vohoangngan85@gmail.com" className="text-sm hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5">
            <Mail size={14} /> Email
          </a>
        </div>

        <p className="font-tech text-[10px] uppercase tracking-[0.22em] text-secondary/45">
          © {new Date().getFullYear()} sLearningKaka · Built with care, in HCMC
        </p>
      </div>
    </footer>
  );
}
