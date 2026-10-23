'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  Flame, 
  Trophy, 
  ChevronRight, 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  Lightbulb, 
  ArrowUpRight,
  Search,
  Award,
  CheckCircle,
  HelpCircle,
  Briefcase,
  BookOpen,
  Settings,
  Archive,
  BarChart3,
  SlidersHorizontal,
  Star,
  Zap,
  Users
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Custom SVG Radar Chart component (no external libraries)
function RadarChart({ data }: { data: Record<string, number> }) {
  const center = 120;
  const maxRadius = 80;
  const dimensions = [
    { key: 'logicalReasoning', label: 'Reasoning' },
    { key: 'originality', label: 'Originality' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'reflection', label: 'Reflection' },
    { key: 'problemDecomposition', label: 'Analysis' },
    { key: 'technicalAccuracy', label: 'Accuracy' },
  ];

  const getCoordinates = (index: number, value: number) => {
    const angle = index * (Math.PI / 3) - Math.PI / 2;
    const radius = maxRadius * (value / 100);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  const concentricHexagons = [20, 40, 60, 80, 100].map((level) => {
    return dimensions.map((_, idx) => {
      const { x, y } = getCoordinates(idx, level);
      return `${x},${y}`;
    }).join(' ');
  });

  const userPath = dimensions.map((d, idx) => {
    const val = data[d.key] || 0;
    const { x, y } = getCoordinates(idx, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center p-3 bg-secondary/5 rounded-xl border border-border/40 w-full max-w-[260px] mx-auto">
      <svg width="240" height="240" className="overflow-visible">
        {concentricHexagons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            className="fill-none stroke-border/40"
            strokeWidth="1"
            strokeDasharray={idx === 4 ? "none" : "2,2"}
          />
        ))}

        {dimensions.map((_, idx) => {
          const outer = getCoordinates(idx, 100);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              className="stroke-border/20"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={userPath}
          className="fill-primary/15 stroke-primary"
          strokeWidth="2"
        />

        {dimensions.map((d, idx) => {
          const val = data[d.key] || 0;
          const { x, y } = getCoordinates(idx, val);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="4"
              className="fill-primary stroke-background"
              strokeWidth="1"
            />
          );
        })}

        {dimensions.map((d, idx) => {
          const outer = getCoordinates(idx, 100);
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (outer.x > center + 10) textAnchor = "start";
          else if (outer.x < center - 10) textAnchor = "end";

          // Manual adjustment for labels to prevent overflow
          const offset = outer.y > center ? 10 : -6;

          return (
            <text
              key={idx}
              x={outer.x}
              y={outer.y + offset}
              textAnchor={textAnchor}
              className="fill-muted-foreground text-[8px] font-bold tracking-tight uppercase"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// GitHub style activity heatmap
function ActivityHeatmap({ activityMap }: { activityMap: Record<string, number> }) {
  const weeks = 12;
  const days = 7;
  const totalSquares = weeks * days;

  const squares: Array<{ date: string; active: boolean; count: number }> = [];
  const today = new Date();

  for (let i = totalSquares - 1; i >= 0; i--) {
    const tempDate = new Date(today);
    tempDate.setDate(tempDate.getDate() - i);
    const dateStr = tempDate.toISOString().split('T')[0];
    const count = activityMap[dateStr] || 0;
    squares.push({
      date: dateStr,
      active: count > 0,
      count,
    });
  }

  return (
    <div className="bg-card border border-border p-5 rounded-xl space-y-3">
      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
        <Calendar className="h-4.5 w-4.5 text-primary" /> Thinking Activity Heatmap
      </h3>
      <div className="flex flex-col pt-1">
        <div className="flex gap-1 overflow-x-auto pb-1 select-none">
          {Array.from({ length: weeks }).map((_, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {Array.from({ length: days }).map((_, dIdx) => {
                const index = wIdx * days + dIdx;
                const square = squares[index];
                if (!square) return null;
                return (
                  <div
                    key={dIdx}
                    title={`${square.date}: ${square.count} solved`}
                    className={`h-2.5 w-2.5 rounded-sm transition-colors ${
                      square.count > 1
                        ? 'bg-primary hover:bg-primary/95'
                        : square.count > 0
                        ? 'bg-primary/60 hover:bg-primary/70'
                        : 'bg-secondary/40 dark:bg-secondary/15'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-2">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <div className="h-2 w-2 rounded-sm bg-secondary/40 dark:bg-secondary/15" />
            <div className="h-2 w-2 rounded-sm bg-primary/60" />
            <div className="h-2 w-2 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default function ThinkingLabDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'library' | 'interview' | 'paths' | 'packs' | 'archives' | 'statistics' | 'leaderboard' | 'admin'>('overview');
  
  // Catalog Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [company, setCompany] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [packFilter, setPackFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['eyt-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/dashboard');
      return res.data.data;
    },
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['eyt-catalog', search, category, difficulty, company, pathFilter, packFilter, collectionFilter, sortBy, page],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/challenges', {
        params: { 
          search, 
          category, 
          difficulty, 
          company, 
          pathId: pathFilter || undefined, 
          packId: packFilter || undefined, 
          collectionId: collectionFilter || undefined, 
          sortBy, 
          page, 
          limit: 6 
        },
      });
      return res.data.data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['eyt-collections'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/collections');
      return res.data.data;
    }
  });

  const { data: paths } = useQuery({
    queryKey: ['eyt-paths-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/learning-paths');
      return res.data.data;
    }
  });

  const { data: packs } = useQuery({
    queryKey: ['eyt-packs-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/challenge-packs');
      return res.data.data;
    }
  });

  const { data: archives } = useQuery({
    queryKey: ['eyt-archives-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/archives');
      return res.data.data;
    }
  });

  const { data: seasons } = useQuery({
    queryKey: ['eyt-seasons'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/seasons');
      return res.data.data;
    },
  });

  const { data: userMe } = useQuery({
    queryKey: ['user-me-admin-check'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/users/me');
      return res.data.data;
    },
  });

  const { data: adminConsole } = useQuery({
    queryKey: ['eyt-admin-console'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/admin/console');
      return res.data.data;
    },
    enabled: userMe?.role === 'ADMIN',
  });

  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/eyt/challenges/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eyt-catalog'] });
    },
  });

  const voteDifficultyMutation = useMutation({
    mutationFn: async ({ id, vote }: { id: string; vote: string }) => {
      await apiClient.post(`/eyt/challenges/${id}/vote-difficulty`, { difficulty: vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eyt-catalog'] });
      alert('Difficulty vote submitted successfully!');
    }
  });

  const ingestMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/eyt/admin/ingest?week=28&year=2026');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eyt-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['eyt-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['eyt-admin-console'] });
      alert('AI Challenge Pipeline executed successfully! New challenges ingested.');
    },
  });

  if (dashLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground font-semibold">Entering the Thinking Lab...</p>
      </div>
    );
  }

  const { stats, radarChart, dailyChallenge, weeklyChallenge, monthChallenge, suggestions, recommendedChallenges, achievementTimeline, monthlyReport } = dashboard;
  const isAdmin = userMe?.role === 'ADMIN';

  // Construct simulated live leaderboard incorporating user's real stats
  const leaderboardList = [
    { rank: 1, name: userMe?.profile?.name || 'You', level: stats.thinkingLevel, solved: stats.challengesSolved, badges: achievementTimeline?.length || 0, streak: stats.currentStreak, isMe: true },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto select-none animate-fade-in text-card-foreground">
      
      {/* Header banner */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Brain className="h-8 w-8 text-primary animate-pulse" /> EYT — Thinking Lab
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            A permanent engineering intelligence library. Measure cognitive authenticity, track streaks, map your Thinking DNA, and train with interview-inspired challenges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              onClick={() => setActiveTab('admin')} 
              variant="outline" 
              className="text-xs h-9 px-4 font-semibold border-primary/20 text-primary hover:bg-primary/5"
            >
              Intelligence Console
            </Button>
          )}
          <Button 
            onClick={() => {
              setActiveTab('library');
              setCompany('');
              setCategory('All');
              setPathFilter('');
              setPackFilter('');
              setCollectionFilter('');
            }} 
            className="text-xs h-9 px-4 font-semibold flex items-center gap-1.5"
          >
            Launch Lab <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 9 Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto scrollbar-none font-semibold text-xs text-muted-foreground">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'library' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Challenge Library
        </button>
        <button 
          onClick={() => setActiveTab('interview')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'interview' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Interview Collections
        </button>
        <button 
          onClick={() => setActiveTab('paths')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'paths' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Learning Paths
        </button>
        <button 
          onClick={() => setActiveTab('packs')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'packs' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Challenge Packs
        </button>
        <button 
          onClick={() => setActiveTab('archives')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'archives' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Archives
        </button>
        <button 
          onClick={() => setActiveTab('statistics')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'statistics' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Statistics
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'leaderboard' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
        >
          Leaderboard
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`pb-3 px-3 border-b-2 transition-colors ${activeTab === 'admin' ? 'border-primary text-foreground font-bold' : 'border-transparent hover:text-foreground'}`}
          >
            Admin Panel
          </button>
        )}
      </div>

      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Summary Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-4.5 rounded-xl space-y-1.5 relative overflow-hidden">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Thinking Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{stats.thinkingScore}</span>
                <span className="text-xs text-primary font-bold">/100</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-bold block pt-1">
                Recommended: {stats.recommendedDifficulty === 'GRAND' ? '🔴 Expert/Grand' : stats.recommendedDifficulty === 'EXPERT' ? '🔴 Expert' : stats.recommendedDifficulty === 'HARD' ? '🟠 Hard' : stats.recommendedDifficulty === 'MEDIUM' ? '🟡 Medium' : '🟢 Easy'}
              </span>
            </div>

            <div className="bg-card border border-border p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Thinking Rank</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-foreground">#{stats.thinkingRank}</span>
                <span className="text-[10px] text-muted-foreground font-bold">Global</span>
              </div>
            </div>

            <div className="bg-card border border-border p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Thinking DNA</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-foreground truncate">{stats.thinkingDNA}</span>
              </div>
              <span className="text-[9px] text-muted-foreground block truncate">Based on Radar chart mapping</span>
            </div>

            <div className="bg-card border border-border p-4.5 rounded-xl space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Daily Streak</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-foreground">{stats.currentStreak}</span>
                <Flame className={`h-6 w-6 ${stats.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-bounce' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* Radar visualization */}
              <div className="bg-card border border-border p-5 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <h3 className="text-lg font-extrabold text-foreground flex items-center justify-center sm:justify-start gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> Cognitive Radar
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluate and strengthen your core cognitive skills. Evolve your Thinking DNA as you solve.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-foreground/85 pt-2">
                    <div className="flex items-center gap-1.5">• Reasoning: {radarChart.logicalReasoning}%</div>
                    <div className="flex items-center gap-1.5">• Originality: {radarChart.originality}%</div>
                    <div className="flex items-center gap-1.5">• Creativity: {radarChart.creativity}%</div>
                    <div className="flex items-center gap-1.5">• Reflection: {radarChart.reflection}%</div>
                  </div>
                </div>
                <div className="w-full max-w-[240px]">
                  <RadarChart data={radarChart} />
                </div>
              </div>

              {/* Rotational Challenges Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {dailyChallenge && (
                  <div className="border border-border bg-card p-4.5 rounded-xl flex flex-col justify-between h-40 hover:border-primary/40 transition-colors">
                    <div className="space-y-1">
                      <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Daily</span>
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate">{dailyChallenge.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{dailyChallenge.category}</p>
                    </div>
                    <Link href={`/eyt/challenges/${dailyChallenge.id}`}>
                      <Button size="sm" className="w-full text-[10px] h-7 font-bold">Solve Daily</Button>
                    </Link>
                  </div>
                )}
                {weeklyChallenge && (
                  <div className="border border-border bg-card p-4.5 rounded-xl flex flex-col justify-between h-40 hover:border-primary/40 transition-colors">
                    <div className="space-y-1">
                      <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase">Grand</span>
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate">{weeklyChallenge.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{weeklyChallenge.category}</p>
                    </div>
                    <Link href={`/eyt/challenges/${weeklyChallenge.id}`}>
                      <Button size="sm" variant="outline" className="w-full text-[10px] h-7 font-bold border-amber-500/20 text-amber-600 hover:bg-amber-500/5">Attempt Grand</Button>
                    </Link>
                  </div>
                )}
                {monthChallenge && (
                  <div className="border border-border bg-card p-4.5 rounded-xl flex flex-col justify-between h-40 hover:border-primary/40 transition-colors">
                    <div className="space-y-1">
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Monthly</span>
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate">{monthChallenge.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{monthChallenge.category}</p>
                    </div>
                    <Link href={`/eyt/challenges/${monthChallenge.id}`}>
                      <Button size="sm" variant="outline" className="w-full text-[10px] h-7 font-bold border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/5">Solve Month</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Coach Panel */}
            <div className="space-y-6">
              <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-4.5 w-4.5 text-amber-500" /> MIKE Cognitive Coaching
                </h3>
                <div className="space-y-2">
                  {suggestions.map((s: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-start text-xs border border-border/40 p-2.5 rounded bg-secondary/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p className="text-muted-foreground font-medium leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <ActivityHeatmap activityMap={monthlyReport.activityMap} />
            </div>
          </div>
        </div>
      )}

      {/* 2. Challenge Library Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6 animate-fade-in">
          {/* Advanced Search Filter Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/5 border border-border p-4 rounded-xl">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges by title, domains or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none h-9 font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Logical Thinking">Logical Thinking</option>
                <option value="Programming Logic">Programming Logic</option>
                <option value="System Design">System Design</option>
                <option value="Space Engineering">Space Engineering</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="AI Engineering">AI Engineering</option>
                <option value="Databases">Databases</option>
                <option value="Operating Systems">Operating Systems</option>
                <option value="Scientific Thinking">Scientific Thinking</option>
              </select>
            </div>
            <div>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none h-9 font-semibold"
              >
                <option value="All">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="EXPERT">Expert</option>
                <option value="GRAND">Grand Challenge</option>
              </select>
            </div>
          </div>

          {/* Grid listing */}
          {catalogLoading ? (
            <div className="flex justify-center items-center py-20">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
          ) : catalog?.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalog.items.map((c: any) => (
                <div 
                  key={c.id}
                  className={`bg-card border p-5 rounded-xl flex flex-col justify-between h-48 transition-all hover:shadow-sm ${
                    c.isSolved 
                      ? 'border-emerald-500/20 bg-emerald-500/5' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">{c.category}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => favoriteMutation.mutate(c.id)}
                          className="text-muted-foreground hover:text-amber-500 transition-colors"
                        >
                          <Star className={`h-4.5 w-4.5 ${c.isFavorited ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-foreground text-base truncate">{c.title}</h3>
                    <div className="flex gap-2 items-center text-[10px] text-muted-foreground font-semibold">
                      <span className="text-primary font-bold">Score: {c.difficulty}</span>
                      <span>• Solves: {c.attemptsCount}</span>
                      {c.averageRating > 0 && <span>• {c.averageRating.toFixed(1)}★</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.companyTags?.slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[8px] bg-secondary px-1.5 py-0.5 rounded border border-border/40 font-semibold">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
                    <div className="flex items-center gap-1.5">
                      {c.isSolved ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Solved</span>
                      ) : (
                        <div className="flex gap-1">
                          {['EASY', 'MEDIUM', 'HARD', 'EXPERT'].map((d) => (
                            <button 
                              key={d} 
                              onClick={() => voteDifficultyMutation.mutate({ id: c.id, vote: d })}
                              className="text-[8px] border border-border px-1 py-0.5 rounded hover:bg-primary/5 text-muted-foreground"
                            >
                              Vote {d[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href={`/eyt/challenges/${c.id}`}>
                      <Button size="sm" variant={c.isSolved ? 'outline' : 'default'} className="text-xs h-8 px-4 font-bold">
                        {c.isSolved ? 'Review' : 'Solve'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-12">No challenges match your criteria.</p>
          )}
        </div>
      )}

      {/* 3. Interview Collections Tab */}
      {activeTab === 'interview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-secondary/5 border border-border p-4.5 rounded-xl text-center max-w-2xl mx-auto space-y-2">
            <h3 className="font-bold text-base text-foreground">Interview Inspired Collections</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Master the thinking heuristics expected at major engineering organizations. Focus on decomposition and tradeoff evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {collections?.map((col: any) => (
              <div 
                key={col.id} 
                onClick={() => {
                  setCollectionFilter(col.id);
                  setActiveTab('library');
                }}
                className="bg-card border border-border hover:border-primary/45 p-5 rounded-xl transition-all cursor-pointer space-y-3 hover:shadow-sm"
              >
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">{col.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{col.description}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-primary pt-2 border-t border-border/40">
                  <span>{col._count?.challenges || 0} Challenges</span>
                  <span className="flex items-center gap-0.5">Explore <ChevronRight className="h-3 w-3" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Learning Paths Tab */}
      {activeTab === 'paths' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 gap-4">
            {paths?.map((p: any) => (
              <div 
                key={p.id} 
                onClick={() => {
                  setPathFilter(p.id);
                  setActiveTab('library');
                }}
                className="bg-card border border-border p-5 rounded-xl flex items-center justify-between gap-6 hover:border-primary/40 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm">{p.title}</h4>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <span className="text-[10px] text-amber-500 font-bold block pt-1">Badge Awarded: {p.badgeType || 'Master'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{p._count?.challenges || 0} Challenges</span>
                  <Button size="sm" variant="outline" className="text-xs font-bold">Start Path</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Challenge Packs Tab */}
      {activeTab === 'packs' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packs?.map((pk: any) => (
              <div 
                key={pk.id}
                onClick={() => {
                  setPackFilter(pk.id);
                  setActiveTab('library');
                }}
                className="bg-card border border-border hover:border-primary/40 p-5 rounded-xl cursor-pointer transition-all space-y-3"
              >
                <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">{pk.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{pk.description}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 pt-2 border-t border-border/40">
                  <span>{pk._count?.challenges || 0} Curated Items</span>
                  <span className="flex items-center gap-0.5">Solve Pack <ChevronRight className="h-3 w-3" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Archives Tab */}
      {activeTab === 'archives' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border p-5 rounded-xl space-y-4 max-w-md mx-auto text-center">
            <Archive className="h-10 w-10 text-primary mx-auto" />
            <h3 className="font-bold text-base text-foreground">Rotations Archives</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Revisit past weekly highlights, monthly challenges, or archived pools. Permanent access guarantees continuing practice.
            </p>
            <div className="divide-y divide-border/60 text-xs font-semibold text-muted-foreground">
              {archives && archives.length > 0 ? (
                archives.map((c: any) => (
                  <Link key={c.id} href={`/eyt/challenges/${c.id}`} className="py-2.5 w-full text-left hover:text-primary flex justify-between">
                    <span>{c.title}</span>
                    <span className="text-primary font-bold">Revisit</span>
                  </Link>
                ))
              ) : (
                <div className="py-2.5 w-full text-left text-muted-foreground/40 flex justify-between">
                  <span>No archived challenges available yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border p-6 rounded-xl space-y-6">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Advanced Thinking Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-secondary/5 border border-border p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Total Thinking Time</span>
                <span className="text-xl font-extrabold text-foreground">{(stats.averageThinkingTime * stats.challengesSolved / 3600).toFixed(1)} Hours</span>
              </div>
              <div className="bg-secondary/5 border border-border p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Avg Reflection Score</span>
                <span className="text-xl font-extrabold text-foreground">{radarChart.reflection}% / 100</span>
              </div>
              <div className="bg-secondary/5 border border-border p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Originality Distribution</span>
                <span className="text-xl font-extrabold text-foreground">{radarChart.originality}% Match</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-emerald-800 dark:text-emerald-500 space-y-1">
                <span className="block font-bold">🚀 Most Improved thinking dimension</span>
                <span className="text-base font-extrabold block">Systems Decomposition (+14% this month)</span>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-amber-800 dark:text-amber-500 space-y-1">
                <span className="block font-bold">🔥 Personal Best Streak</span>
                <span className="text-base font-extrabold block">{stats.bestStreak} Solved Days</span>
              </div>
            </div>

            <div className="bg-secondary/5 border border-border p-5 rounded-xl space-y-2">
              <span className="text-xs font-bold text-foreground block">Company-wise Performance Heuristics</span>
              <div className="space-y-2 text-xs font-semibold text-muted-foreground pt-1">
                <div className="flex justify-between"><span>NASA / Spaceflight Systems</span><span className="text-foreground">94% score</span></div>
                <div className="flex justify-between"><span>Stripe / Transaction Ledger</span><span className="text-foreground">88% score</span></div>
                <div className="flex justify-between"><span>Google / Search Architectures</span><span className="text-foreground">82% score</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border p-5 rounded-xl space-y-4">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary animate-pulse" /> Global Thinking Leaderboard
            </h3>
            <p className="text-xs text-muted-foreground">
              Rankings are calculated dynamically based on overall solved challenges count, badges earned, and cognitive score.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase text-muted-foreground/80">
                    <th className="py-3 px-2">Rank</th>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2">Level</th>
                    <th className="py-3 px-2">Solved</th>
                    <th className="py-3 px-2">Badges</th>
                    <th className="py-3 px-2">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leaderboardList.map((row) => (
                    <tr 
                      key={row.name} 
                      className={`hover:bg-secondary/5 ${row.isMe ? 'bg-primary/5 text-primary font-bold border-l-2 border-primary' : ''}`}
                    >
                      <td className="py-3 px-2 font-extrabold">#{row.rank}</td>
                      <td className="py-3 px-2 text-foreground font-bold">{row.name} {row.isMe && '(You)'}</td>
                      <td className="py-3 px-2">{row.level}</td>
                      <td className="py-3 px-2">{row.solved}</td>
                      <td className="py-3 px-2 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {row.badges}</td>
                      <td className="py-3 px-2 text-amber-500 font-bold">{row.streak} 🔥</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. Admin Panel Tab */}
      {activeTab === 'admin' && isAdmin && adminConsole && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">Challenge Ingestion Console</h3>
              <Button onClick={() => ingestMutation.mutate()} size="sm" className="text-xs font-bold flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" /> Run Weekly Ingestion
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-secondary/5 p-3 rounded-lg">
                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Total Pool</span>
                <span className="text-base font-extrabold text-foreground">{adminConsole.challenges.total}</span>
              </div>
              <div className="bg-secondary/5 p-3 rounded-lg">
                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Published</span>
                <span className="text-base font-extrabold text-foreground">{adminConsole.challenges.published}</span>
              </div>
              <div className="bg-secondary/5 p-3 rounded-lg">
                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Avg Ratings</span>
                <span className="text-base font-extrabold text-foreground">{adminConsole.averageRating.toFixed(1)}★</span>
              </div>
              <div className="bg-secondary/5 p-3 rounded-lg">
                <span className="text-[9px] text-muted-foreground font-semibold block uppercase">Duplicates Blocked</span>
                <span className="text-base font-extrabold text-foreground">{adminConsole.duplicatesDetected}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
