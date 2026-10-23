'use client';

import { useQuery } from '@tanstack/react-query';
import { Brain, Flame, Trophy, Award, Sparkles, ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { getDeterministicColor, getInitials, cn } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';

type LeaderboardTab = 'global' | 'branch' | 'semester' | 'friends';

export default function LeaderboardsView() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');

  const { data: leaderboards, isLoading, error } = useQuery({
    queryKey: ['eyt-leaderboards'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/eyt/leaderboard');
      return res.data.data;
    },
  });

  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001';
    return `${baseUrl}${path}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading leaderboards...</p>
      </div>
    );
  }

  if (error || !leaderboards) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive max-w-md mx-auto my-12">
        Failed to load leaderboards. Ensure the EYT feature flag is enabled.
      </div>
    );
  }

  const list = leaderboards[activeTab] || [];

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto animate-fade-in select-none">
      
      {/* Header Info */}
      <div className="border-b border-border pb-5 space-y-1">
        <Link href="/eyt" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-500" /> Cognitive Leaderboards
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          See how your independent problem-solving skills match up against global peers, branch mates, and semesters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3.5">
        {[
          { key: 'global', label: 'Global Rankings' },
          { key: 'branch', label: 'My Department' },
          { key: 'semester', label: 'My Semester' },
          { key: 'friends', label: 'Friends Network' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as LeaderboardTab)}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold border transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-secondary text-foreground font-black border-border'
                : 'bg-background border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-extrabold bg-secondary/10 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5 w-20 text-center">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Thinking Level</th>
                <th className="py-3.5 px-4 text-center">Streak</th>
                <th className="py-3.5 px-4 text-right">Score</th>
                <th className="py-3.5 px-5 text-right w-28">Thinking XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {list.length > 0 ? (
                list.map((profile: any, index: number) => {
                  const rank = index + 1;
                  const initials = getInitials(profile.name);
                  const isTop3 = rank <= 3;
                  const rankStyle = 
                    rank === 1 ? 'text-amber-500 font-black' :
                    rank === 2 ? 'text-slate-400 font-black' :
                    rank === 3 ? 'text-amber-700 font-black' : 'text-muted-foreground font-bold';

                  const avatarUrl = getAvatarUrl(profile.avatarUrl);

                  return (
                    <tr 
                      key={profile.userId}
                      className="hover:bg-secondary/5 transition-colors font-medium text-foreground/90"
                    >
                      {/* Rank */}
                      <td className="py-4 px-5 text-center">
                        <span className={cn("text-base flex items-center justify-center gap-1", rankStyle)}>
                          {rank === 1 && <Trophy className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />}
                          {rank}
                        </span>
                      </td>

                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white select-none border border-border/80 uppercase overflow-hidden flex-shrink-0",
                              !profile.avatarUrl && getDeterministicColor(profile.userId).bg,
                              !profile.avatarUrl && getDeterministicColor(profile.userId).text
                            )}
                          >
                            {profile.avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <span className="font-extrabold text-foreground truncate max-w-[150px] block">
                            {profile.name}
                          </span>
                        </div>
                      </td>

                      {/* Thinking Level */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> {profile.thinkingLevel}
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="py-4 px-4 text-center">
                        {profile.currentStreak > 0 ? (
                          <span className="font-bold text-amber-500 flex items-center justify-center gap-1">
                            <Flame className="h-4 w-4 fill-amber-500/10" /> {profile.currentStreak}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-semibold">-</span>
                        )}
                      </td>

                      {/* Thinking Score */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-foreground">{profile.thinkingScore}</span>
                        <span className="text-[10px] text-muted-foreground">/100</span>
                      </td>

                      {/* Thinking XP */}
                      <td className="py-4 px-5 text-right">
                        <span className="font-black text-primary flex items-center justify-end gap-1.5">
                          <Award className="h-4 w-4" /> {profile.thinkingXP.toLocaleString()}
                        </span>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                    No student records found in this cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
