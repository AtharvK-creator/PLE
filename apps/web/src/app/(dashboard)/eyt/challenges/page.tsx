'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Brain, Search, Award, CheckCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  'All',
  'Logical Reasoning',
  'Programming Logic',
  'Algorithms',
  'System Design',
  'Space Engineering',
  'Product Design',
  'AI Ethics',
  'Reverse Engineering',
  'Database Design',
  'Cloud Architecture',
  'Cybersecurity',
  'Debugging',
  'UI/UX Decisions',
];

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard', 'Expert', 'Grand Challenge'];

export default function ChallengesCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const { data: challenges, isLoading, error } = useQuery({
    queryKey: ['eyt-challenges'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/challenges');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading challenges...</p>
      </div>
    );
  }

  if (error || !challenges) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive max-w-md mx-auto my-12">
        Failed to load challenges. Ensure the EYT feature flag is enabled.
      </div>
    );
  }

  // Filter challenges
  const challengesList = Array.isArray(challenges) ? challenges : (challenges as any).items || [];
  const filteredChallenges = challengesList.filter((c: any) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto animate-fade-in select-none">
      
      {/* Header Banner */}
      <div className="border-b border-border pb-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/eyt" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Cognitive Challenge Catalog</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select a reasoning exercise to solve. Complete challenges to earn XP and showcase your growth.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/5 border border-border p-4 rounded-xl">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges by title or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 font-semibold"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 font-semibold"
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>{diff} Difficulty</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredChallenges.map((c: any) => (
            <div 
              key={c.id} 
              className={`bg-card border p-5 rounded-xl flex flex-col justify-between h-48 transition-all hover:shadow-sm ${
                c.isSolved 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">
                    {c.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-primary" /> +{c.xpReward} XP
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg tracking-tight leading-snug truncate">
                  {c.title}
                </h3>
                <div className="flex gap-2 items-center text-xs font-semibold text-muted-foreground">
                  <span>Level: {c.difficulty}</span>
                  {c.isDaily && <span className="text-amber-500">• Daily Challenge</span>}
                  {c.isWeekly && <span className="text-primary">• Grand Challenge</span>}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
                {c.isSolved ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500 font-bold">
                    <CheckCircle className="h-4.5 w-4.5" /> Solved ({c.score}/100)
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <HelpCircle className="h-4.5 w-4.5" /> Unsolved
                  </div>
                )}
                
                <Link href={`/eyt/challenges/${c.id}`}>
                  <Button 
                    size="sm" 
                    variant={c.isSolved ? "outline" : "default"}
                    className="font-semibold text-xs h-8 px-4"
                  >
                    {c.isSolved ? 'Review Answer' : 'Solve Challenge'}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-dashed border-border bg-secondary/5 text-muted-foreground text-sm font-semibold">
          No challenges matches your search filters.
        </div>
      )}
    </div>
  );
}
