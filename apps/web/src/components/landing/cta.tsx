'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingCTA() {
  return (
    <section className="py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-600/10 p-12 backdrop-blur-sm relative overflow-hidden">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64 bg-purple-500/20 blur-3xl" />
          </div>

          <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">
            Your engineering journey{' '}
            <span className="gradient-text">starts today</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of engineering students who are learning smarter with AI-powered
            personalized education. Free to start. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="group h-12 px-8 text-base font-semibold glow"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(262,83%,67%) 0%, hsl(217,91%,60%) 100%)',
                }}
              >
                Get Started — It&apos;s Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-8 text-base text-muted-foreground hover:text-foreground"
              >
                Already have an account? Sign in
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
