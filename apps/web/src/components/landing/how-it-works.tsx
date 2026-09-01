'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: 'Set Up Your Profile',
    description:
      'Tell PLE your engineering branch, semester, skill level, and career goal. Takes 2 minutes.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    step: '02',
    title: 'Generate Your Roadmap',
    description:
      'AI crafts a personalized week-by-week learning path. Each step includes skills, resources, and milestones.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    step: '03',
    title: 'Learn & Practice',
    description:
      'Follow your roadmap, quiz yourself on topics, and chat with the AI tutor whenever you need help.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    step: '04',
    title: 'Track Your Growth',
    description:
      'Watch your skills develop on the dashboard. Mark steps complete and build a consistent learning habit.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-24 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-3">
            How it works
          </p>
          <h2 className="text-4xl font-bold sm:text-5xl">
            From confused to confident{' '}
            <span className="gradient-text">in 4 steps</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-[calc(2rem-1px)] top-10 bottom-10 w-px bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500 opacity-30 sm:left-1/2 sm:-translate-x-px hidden sm:block" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-6 ${
                  i % 2 !== 0 ? 'sm:flex-row-reverse' : ''
                }`}
              >
                {/* Content */}
                <div className="flex-1">
                  <div className="rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Step circle */}
                <div className="relative flex-shrink-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                  <div
                    className={`h-16 w-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-lg font-bold text-white">{step.step}</span>
                  </div>
                </div>

                {/* Empty spacer for alternating layout */}
                <div className="hidden sm:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
