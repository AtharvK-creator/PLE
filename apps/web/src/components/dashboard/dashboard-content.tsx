'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Map,
  BookOpen,
  Brain,
  Target,
  CheckCircle2,
  Award,
  Sparkles,
  GraduationCap,
  Clock,
  ChevronRight,
  TrendingUp,
  Layers,
  Search
} from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  roadmaps: {
    total: number;
    active: number;
    latestRoadmap: {
      id: string;
      title: string;
      goal: string;
      completedSteps: number;
      totalSteps: number;
    } | null;
  };
  quizzes: {
    totalAttempts: number;
    averageScore: number;
    recentAttempts: Array<{
      id: string;
      quizTopic: string;
      score: number;
      totalQuestions: number;
      completedAt: string;
    }>;
  };
  tutor: {
    totalSessions: number;
    totalMessages: number;
    recentSessions: Array<{
      id: string;
      title: string;
      messageCount: number;
      updatedAt: string;
    }>;
  };
  learningGoals: {
    total: number;
    active: number;
    completed: number;
  };
  skills: {
    total: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  careerReadinessScore: number;
  skillsProgress: number;
  mikeRecommendations: string[];
}

export function DashboardContent() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardStats }>('/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto animate-fade-in select-none">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-10 w-64 rounded-lg bg-secondary shimmer" />
          <div className="h-5 w-96 rounded bg-secondary shimmer" />
        </div>

        {/* Dashboard Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-lg border border-border bg-card p-6 h-[320px] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary shimmer" />
                <div className="h-6 w-40 rounded bg-secondary shimmer" />
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full rounded bg-secondary shimmer" />
                <div className="h-4 w-11/12 rounded bg-secondary shimmer" />
                <div className="h-4 w-4/5 rounded bg-secondary shimmer" />
                <div className="h-4 w-3/4 rounded bg-secondary shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const latestRoadmap = stats?.roadmaps?.latestRoadmap;
  const roadmapProgress =
    latestRoadmap && latestRoadmap.totalSteps > 0
      ? Math.round((latestRoadmap.completedSteps / latestRoadmap.totalSteps) * 100)
      : 0;

  const readinessScore = stats?.careerReadinessScore ?? 0;
  const readinessLabel =
    readinessScore >= 80 ? 'High' : readinessScore >= 50 ? 'Medium' : 'Low';
  const readinessColorClass =
    readinessScore >= 80
      ? 'text-emerald-500'
      : readinessScore >= 50
      ? 'text-amber-500'
      : 'text-rose-500';

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in select-none">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome back! 👋</h2>
        <p className="text-base text-muted-foreground mt-1.5 leading-relaxed">
          Here is a summary of your learning progress, roadmap status, and active skill goals.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        
        {/* Card 1: Learning Snapshot */}
        <div className="pro-card flex flex-col justify-between h-[320px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Learning Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Roadmaps</span>
                <p className="text-2xl font-extrabold text-foreground">{stats?.roadmaps?.active ?? 0}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Goals Completed</span>
                <p className="text-2xl font-extrabold text-foreground">{stats?.learningGoals?.completed ?? 0}</p>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Quiz Attempts</span>
                <p className="text-2xl font-extrabold text-foreground">{stats?.quizzes?.totalAttempts ?? 0}</p>
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tutor Sessions</span>
                <p className="text-2xl font-extrabold text-foreground">{stats?.tutor?.totalSessions ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex justify-between items-center">
            <span>Engineering portfolio is active</span>
            <Link href="/settings" className="text-primary hover:underline font-semibold">
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Card 2: Career Readiness */}
        <div className="pro-card flex flex-col justify-between h-[320px] items-center text-center">
          <div className="w-full">
            <div className="flex items-center gap-2.5 mb-2 text-left justify-start">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Career Readiness</h3>
            </div>
          </div>

          <div className="relative flex items-center justify-center h-32 w-32 my-1">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-secondary"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-primary"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - readinessScore / 100)}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-foreground">{readinessScore}%</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${readinessColorClass}`}>
                {readinessLabel}
              </span>
            </div>
          </div>

          <div className="w-full border-t border-border pt-4 text-xs text-muted-foreground">
            Core readiness index calculated by MIKE AI analysis.
          </div>
        </div>

        {/* Card 3: Skills Progress */}
        <div className="pro-card flex flex-col justify-between h-[320px]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Skills Progress</h3>
            </div>
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-base font-semibold text-foreground mb-1.5">
                  <span>Skills Mastery</span>
                  <span>{stats?.skillsProgress ?? 0}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${stats?.skillsProgress ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1 mt-1 border border-border">
                <p className="font-semibold text-foreground">Active Skill Inventory</p>
                <p>You have added <span className="text-foreground font-bold">{stats?.skills?.total ?? 0} skills</span> to study path.</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <Link href="/skills">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold h-8 border-border hover:bg-secondary">
                Manage Skills
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 4: Roadmap Progress */}
        <div className="pro-card flex flex-col justify-between h-[320px]">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Map className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Roadmap Progress</h3>
            </div>

            {latestRoadmap ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Path</span>
                  <p className="text-base font-bold text-foreground truncate">{latestRoadmap.title}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                    <span>Progress</span>
                    <span>{roadmapProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${roadmapProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-muted-foreground">You do not have an active learning roadmap.</p>
                <Link href="/roadmap">
                  <Button size="xs" variant="outline" className="text-xs h-7 border-border hover:bg-secondary">
                    Create Roadmap
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            {latestRoadmap ? (
              <Link href="/roadmap">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold h-8 border-border hover:bg-secondary">
                  View Timeline
                </Button>
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground block text-center">No active path</span>
            )}
          </div>
        </div>

        {/* Card 5: Quiz Performance */}
        <div className="pro-card flex flex-col justify-between h-[320px]">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Quiz Performance</h3>
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center bg-secondary/50 rounded-lg p-2.5 border border-border">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Avg Accuracy</span>
                <span className="text-lg font-extrabold text-foreground">{stats?.quizzes?.averageScore ?? 0}%</span>
              </div>
              
              {/* Recent Quiz attempts */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block">Recent Attempts</span>
                {stats?.quizzes?.recentAttempts && stats.quizzes.recentAttempts.length > 0 ? (
                  stats.quizzes.recentAttempts.slice(0, 2).map((att) => (
                    <div key={att.id} className="flex justify-between items-center text-xs border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                      <span className="truncate text-foreground/90 font-medium max-w-[140px]">{att.quizTopic}</span>
                      <span className={`font-bold ${att.score >= 80 ? 'text-emerald-500' : att.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {att.score}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No quiz attempts recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Link href="/quiz">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold h-8 border-border hover:bg-secondary">
                Practice Quizzes
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 6: MIKE Recommendations */}
        <div className="pro-card flex flex-col justify-between h-[320px] bg-secondary/10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              <h3 className="text-xl font-bold text-foreground">MIKE Recommendations</h3>
            </div>
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1.5 custom-scrollbar">
              {stats?.mikeRecommendations && stats.mikeRecommendations.length > 0 ? (
                stats.mikeRecommendations.slice(0, 3).map((rec, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-start p-2 rounded-lg bg-card border border-border text-xs text-foreground/95 hover:border-muted-foreground/20 transition-colors"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <p className="leading-relaxed">{rec}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No advice guidelines compiled. Complete your profile onboarding to load advice.</p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Link href="/tutor">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold h-8 border-border hover:bg-secondary text-primary">
                Consult MIKE Mentor
              </Button>
            </Link>
          </div>
        </div>

      </div>

      {/* Card 7: Recent Activity */}
      <div className="pro-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Recent Platform Activity
          </h3>
        </div>
        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((act, i) => (
              <div key={i} className="flex gap-3.5 items-start text-xs border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="h-6 w-6 rounded bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90 font-medium leading-relaxed">{act.description}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No activity history recorded.</p>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">SaaS Navigation Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Study Timeline', desc: 'Personalized engineering guide', href: '/roadmap', icon: Map },
            { label: 'Tutor Workspace', desc: 'Ask concept clarification', href: '/tutor', icon: Brain },
            { label: 'Practice Exams', desc: 'Adaptive learning checkpoints', href: '/quiz', icon: BookOpen },
            { label: 'SDE Career Center', desc: 'Technical resume builder', href: '/settings?tab=resume', icon: Award },
          ].map((act, i) => {
            const Icon = act.icon;
            return (
              <Link key={i} href={act.href} className="group">
                <div className="pro-card p-5 hover:bg-secondary/40 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{act.label}</p>
                    <p className="text-xs text-muted-foreground">{act.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1 duration-200" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
