'use client';

import { motion } from 'framer-motion';
import { Map, Brain, BookOpen, BarChart2, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Map,
    title: 'AI Roadmap Generator',
    description:
      'Get a personalized, week-by-week learning roadmap crafted by AI based on your branch, semester, and career goal.',
    gradient: 'from-purple-500 to-blue-500',
    glow: 'purple',
  },
  {
    icon: Brain,
    title: 'AI Tutor',
    description:
      'Chat with an AI mentor that knows your profile. Ask questions, get explanations, and go deeper on any topic — in real time.',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'blue',
  },
  {
    icon: BookOpen,
    title: 'Adaptive Quizzes',
    description:
      'Test your understanding with AI-generated quizzes tailored to your topic and difficulty. Get instant feedback and explanations.',
    gradient: 'from-cyan-500 to-teal-500',
    glow: 'cyan',
  },
  {
    icon: BarChart2,
    title: 'Progress Dashboard',
    description:
      'Track your learning streak, roadmap completion, quiz performance, and skill growth all in one place.',
    gradient: 'from-emerald-500 to-green-500',
    glow: 'emerald',
  },
  {
    icon: Shield,
    title: 'Skill Catalog',
    description:
      'Browse 45+ engineering skills across 7 categories. Build your skill profile and let AI recommend what to learn next.',
    gradient: 'from-orange-500 to-pink-500',
    glow: 'orange',
  },
  {
    icon: Zap,
    title: 'Learning Goals',
    description:
      'Set goals, link them to roadmaps, and track them to completion. Stay focused on what matters most to your future.',
    gradient: 'from-pink-500 to-rose-500',
    glow: 'pink',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-400 mb-3">
            Everything you need
          </p>
          <h2 className="text-4xl font-bold sm:text-5xl text-balance">
            One platform,{' '}
            <span className="gradient-text">infinite growth</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            PLE combines AI-powered tools that work together to make your engineering journey
            efficient, personalized, and enjoyable.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-card/80"
              >
                {/* Icon */}
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} p-0.5`}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-background">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>

                {/* Hover gradient line at bottom */}
                <div
                  className={`absolute bottom-0 inset-x-0 h-px rounded-b-2xl bg-gradient-to-r ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
