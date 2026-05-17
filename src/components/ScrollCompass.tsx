import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function ScrollCompass() {
  const { scrollYProgress } = useScroll();
  const compassRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      setScrollPercent(Math.round(latest * 100));
    });
  }, [scrollYProgress]);

  return (
    <div className="fixed bottom-8 left-8 z-50 hidden sm:flex items-center gap-4 bg-surface-container/60 backdrop-blur-md px-5 py-3 rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div className="relative w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center bg-surface-container-high/80 shadow-[inset_0_0_10px_rgba(233,195,73,0.1)]">
        <div className="absolute top-1 text-[7px] font-tech text-primary/80 font-bold">N</div>
        <div className="absolute bottom-1 text-[7px] font-tech text-primary/80 font-bold">S</div>
        <div className="absolute left-1 text-[7px] font-tech text-primary/80 font-bold">W</div>
        <div className="absolute right-1 text-[7px] font-tech text-primary/80 font-bold">E</div>
        <motion.div
          style={{ rotate: compassRotate }}
          className="w-[2px] h-4 bg-gradient-to-t from-transparent via-primary to-primary rounded-full absolute origin-bottom top-1 shadow-[0_0_10px_rgba(233,195,73,1)]"
        />
        <div className="w-1.5 h-1.5 bg-background rounded-full border border-primary absolute z-10" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-tech text-secondary/60 tracking-[0.2em] leading-tight">SCANNING</span>
        <span className="text-primary font-tech font-bold text-lg leading-tight drop-shadow-[0_0_8px_rgba(233,195,73,0.6)]">
          {String(scrollPercent).padStart(2, '0')}%
        </span>
      </div>
    </div>
  );
}
