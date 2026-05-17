import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: ReactNode;
}

export default function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  const [showFx, setShowFx] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on initial mount so first paint isn't a transition.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setShowFx(true);
    const timer = setTimeout(() => setShowFx(false), 700);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <AnimatePresence>
        {showFx && (
          <motion.div
            key="route-fx"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden"
          >
            {/* CRT scanline pinch — kept for the existing power-off feel */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scaleY: 0, scaleX: 1, opacity: 0 }}
                animate={{
                  scaleY: [0, 1, 1, 0.04, 0],
                  scaleX: [1, 1, 1, 0.04, 0],
                  opacity: [0, 0.95, 0.95, 0.85, 0],
                }}
                transition={{
                  duration: 0.7,
                  ease: [0.7, 0, 0.3, 1],
                  times: [0, 0.18, 0.45, 0.75, 1],
                }}
                className="h-[2px] w-full bg-cyan-200/85 shadow-[0_0_18px_rgba(34,211,238,0.9),0_0_40px_rgba(233,195,73,0.6)]"
                style={{ transformOrigin: 'center' }}
              />
            </div>

            {/* Diagonal wipe with thin gold trailing edge */}
            <motion.div
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(110deg, transparent 38%, rgba(13,27,42,0.92) 46%, rgba(13,27,42,0.92) 54%, transparent 62%)',
              }}
            />
            <motion.div
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.02 }}
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(110deg, transparent 53%, rgba(233,195,73,0.95) 54.6%, rgba(34,211,238,0.85) 56%, transparent 57.5%)',
                filter: 'drop-shadow(0 0 12px rgba(233,195,73,0.55))',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
