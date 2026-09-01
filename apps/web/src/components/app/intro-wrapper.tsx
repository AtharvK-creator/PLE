'use client';

import { useState, useEffect } from 'react';
import { IntroAnimation } from './intro-animation';
import { motion, AnimatePresence } from 'framer-motion';

export function IntroWrapper({ children }: { children: React.ReactNode }) {
  const [introCompleted, setIntroCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const played = sessionStorage.getItem('ple-intro-played');
    if (played === 'true') {
      setIntroCompleted(true);
    } else {
      setIntroCompleted(false);
    }
  }, []);

  if (introCompleted === null) {
    // Avoid layout flash of white/dark page background before sessionStorage is read
    return <div className="min-h-screen bg-[#070708]" />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {!introCompleted && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999]"
          >
            <IntroAnimation onComplete={() => setIntroCompleted(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={introCompleted ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="w-full min-h-dvh"
      >
        {children}
      </motion.div>
    </>
  );
}
