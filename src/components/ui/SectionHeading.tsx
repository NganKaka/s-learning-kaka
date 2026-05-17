import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export default function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className={`section-heading-anchor space-y-2 relative ${isInView ? 'section-entered' : ''}`}>
      <span aria-hidden className="section-sweep" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="font-tech text-[10px] uppercase tracking-[0.28em] text-secondary/60"
      >
        {eyebrow}
      </motion.p>
      <div className="relative inline-block">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight relative inline-block pb-2"
        >
          {title}
          <motion.span
            initial={{ scaleX: 0, originX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-0 h-[3px] w-1/2 rounded-full bg-gradient-to-r from-primary via-cyan-400 to-transparent"
          />
        </motion.h2>
      </div>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          className="text-secondary/80 max-w-2xl"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
