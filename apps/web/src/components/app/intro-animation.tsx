'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [scene, setScene] = useState(1);
  const [logoError, setLogoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect accessibility preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Time sequence progression
  useEffect(() => {
    const timeouts = [
      setTimeout(() => setScene(2), 800),    // Scene 2 starts at 0.8s
      setTimeout(() => setScene(3), 2300),   // Scene 3 starts at 2.3s
      setTimeout(() => setScene(4), 3600),   // Scene 4 starts at 3.6s
      setTimeout(() => setScene(5), 4600),   // Scene 5 starts at 4.6s (exit fade)
      setTimeout(() => {
        sessionStorage.setItem('ple-intro-played', 'true');
        onComplete();
      }, 5000)                               // Finished at 5.0s
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  // Handle Skip via click or ESC key
  const handleSkip = () => {
    sessionStorage.setItem('ple-intro-played', 'true');
    onComplete();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scene triggers
  const showLogo = scene === 1;
  const showSplitWords = scene === 2;
  const showMorphing = scene >= 3;
  const isCompressedRow = scene >= 3;
  const scaleAndDetails = scene >= 4;

  // Render standard fallback logo if user hasn't uploaded logo.png
  const renderLogo = () => {
    if (logoError) {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
          <BookOpen className="h-8 w-8 text-primary relative z-10" />
        </div>
      );
    }
    return (
      <img
        src="/logo.png"
        alt="PLE Logo"
        className="h-16 w-auto object-contain max-w-[200px]"
        onError={() => setLogoError(true)}
      />
    );
  };

  return (
    <div 
      onClick={handleSkip}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070708] text-white select-none cursor-pointer overflow-hidden font-sans"
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Skip Hint */}
      <div className="absolute bottom-6 right-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest pointer-events-none select-none opacity-40">
        Click anywhere / Press ESC to skip
      </div>

      <div className="relative flex flex-col items-center justify-center w-full max-w-lg px-4 text-center">
        
        {/* SCENE 1: LOGO */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1.0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex items-center justify-center"
            >
              <div className="relative p-4 rounded-3xl border border-white/5 bg-white/[0.02]">
                {renderLogo()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCENE 2 & 3: WORDS -> PLE MORPH */}
        {scene >= 2 && scene <= 3 && (
          <motion.div 
            layout={!prefersReducedMotion}
            className={`flex items-center justify-center ${isCompressedRow ? 'flex-row gap-3 sm:gap-4' : 'flex-col gap-4'}`}
          >
            {/* Word 1: PERSONALIZED */}
            <motion.div layout={!prefersReducedMotion} className="flex items-center overflow-hidden">
              <motion.span 
                layout={!prefersReducedMotion}
                className="text-3xl sm:text-4xl font-semibold tracking-wider text-white"
              >
                P
              </motion.span>
              <AnimatePresence>
                {!isCompressedRow && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, width: 0, transition: { duration: 0.5 } }}
                    transition={{ delay: 0, duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-semibold tracking-wider text-zinc-400 whitespace-nowrap overflow-hidden"
                  >
                    ERSONALIZED
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Word 2: LEARNING */}
            <motion.div layout={!prefersReducedMotion} className="flex items-center overflow-hidden">
              <motion.span 
                layout={!prefersReducedMotion}
                className="text-3xl sm:text-4xl font-semibold tracking-wider text-white"
              >
                L
              </motion.span>
              <AnimatePresence>
                {!isCompressedRow && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, width: 0, transition: { duration: 0.5 } }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-semibold tracking-wider text-zinc-400 whitespace-nowrap overflow-hidden"
                  >
                    EARNING
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Word 3: ENVIRONMENT */}
            <motion.div layout={!prefersReducedMotion} className="flex items-center overflow-hidden">
              <motion.span 
                layout={!prefersReducedMotion}
                className="text-3xl sm:text-4xl font-semibold tracking-wider text-white"
              >
                E
              </motion.span>
              <AnimatePresence>
                {!isCompressedRow && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, width: 0, transition: { duration: 0.5 } }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-semibold tracking-wider text-zinc-400 whitespace-nowrap overflow-hidden"
                  >
                    NVIRONMENT
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* SCENE 4: FINAL PLE LOGOTYPE */}
        <AnimatePresence>
          {scaleAndDetails && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1.0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center space-y-6"
            >
              {/* PLE Title */}
              <motion.h1 
                initial={prefersReducedMotion ? {} : { scale: 0.95 }}
                animate={{ scale: 1.0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-7xl sm:text-8xl font-black tracking-tight text-white select-none"
              >
                PLE
              </motion.h1>

              {/* Subtitles Container */}
              <div className="space-y-2 pt-2">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-lg sm:text-xl font-medium text-zinc-300 tracking-wide"
                >
                  Personalized Learning Environment
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-sm font-semibold text-primary/80 tracking-wider uppercase"
                >
                  Powered by MIKE
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
