'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, Map, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-28 pb-16 hero-gradient">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -top-20 right-20 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-20 left-1/3 h-60 w-60 rounded-full bg-cyan-600/15 blur-[90px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Powered by MIKE AI Mentor</span>
        </motion.div>
 
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="text-foreground">Learn Smarter.</span>
          <br />
          <span className="gradient-text">Grow Faster.</span>
        </motion.h1>
 
        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground sm:text-xl leading-relaxed"
        >
          MIKE is your personal AI-powered engineering mentor. Get a personalized roadmap,
          practice with adaptive quizzes, and chat with a dedicated guide that understands
          your goals.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/auth/register">
            <Button
              size="lg"
              className="group h-12 px-8 text-base font-semibold glow hover:glow-sm transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, hsl(262,83%,67%) 0%, hsl(217,91%,60%) 100%)',
              }}
            >
              Start Learning Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm"
            >
              See How It Works
            </Button>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-400" />
            <span>10+ Engineering Branches</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-blue-400" />
            <span>AI-Generated Roadmaps</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-cyan-400" />
            <span>Real-time AI Tutor</span>
          </div>
        </motion.div>

        {/* App preview strip */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          <div className="relative rounded-2xl border border-white/10 bg-card/50 p-1 backdrop-blur-md shadow-2xl overflow-hidden">
            {/* Simulated dashboard preview */}
            <div className="rounded-xl bg-muted/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <div className="flex-1 h-6 rounded-md bg-white/5 ml-4" />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {['Roadmap Progress', 'Quizzes Completed', 'Study Streak'].map((label, i) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-card/80 p-4">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <div
                      className="h-7 rounded-md"
                      style={{
                        width: `${[65, 80, 45][i]}%`,
                        background: `linear-gradient(90deg, hsl(${[262, 217, 199][i]},83%,67%) 0%, hsl(${[262, 217, 199][i]},91%,60%) 100%)`,
                        opacity: 0.8,
                      }}
                    />
                    <p className="text-lg font-bold mt-2 text-foreground">
                      {['65%', '24', '7 days'][i]}
                    </p>
                  </div>
                ))}
              </div>
              <div className="h-24 rounded-lg bg-white/5 border border-white/10 flex items-center px-4">
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-3/4 rounded-full bg-white/10" />
                  <div className="h-2 w-1/2 rounded-full bg-white/10" />
                  <div className="h-2 w-2/3 rounded-full bg-purple-500/30" />
                </div>
              </div>
            </div>
          </div>
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-background to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
