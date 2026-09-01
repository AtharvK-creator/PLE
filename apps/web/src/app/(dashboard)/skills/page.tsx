'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Layers,
  Search,
  Filter,
  Loader2,
  Trash2,
  CheckCircle,
  Plus,
  Star,
  Sparkles,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkillDto, UserSkillDto, AddUserSkillDto } from '@ple/types';
import { SKILL_CATEGORIES } from '@ple/shared';

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Fetch Global Skill Catalog
  const { data: catalog = [], isLoading: loadingCatalog } = useQuery<SkillDto[]>({
    queryKey: ['skills-catalog', search, selectedCategory],
    queryFn: async () => {
      let url = '/skills';
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;

      const res = await apiClient.get<{ data: SkillDto[] }>(url);
      return res.data.data;
    },
  });

  // Fetch User's Self-Assessed Skills
  const { data: userSkills = [], isLoading: loadingUserSkills } = useQuery<UserSkillDto[]>({
    queryKey: ['user-skills'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserSkillDto[] }>('/skills/me');
      return res.data.data;
    },
  });

  // Add/Update User Skill Mutation
  const addSkillMutation = useMutation({
    mutationFn: async (dto: AddUserSkillDto) => {
      const res = await apiClient.post<{ data: UserSkillDto }>('/skills/me', dto);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Skill Profile Updated', description: 'Your proficiency level has been saved.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update skill.',
        variant: 'destructive',
      });
    },
  });

  // Remove User Skill Mutation
  const removeSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      await apiClient.delete(`/skills/me/${skillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Skill Removed', description: 'Skill has been removed from your profile.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to remove skill.',
        variant: 'destructive',
      });
    },
  });

  // Toggle Subtopic Completion Mutation
  const toggleSubtopicMutation = useMutation({
    mutationFn: async ({
      skillId,
      subtopicName,
      isCompleted,
    }: {
      skillId: string;
      subtopicName: string;
      isCompleted: boolean;
    }) => {
      const res = await apiClient.patch<{ data: UserSkillDto }>(
        `/skills/me/${skillId}/subtopics`,
        { subtopicName, isCompleted }
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update subtopic.',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateProficiency = (skillId: string, level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    addSkillMutation.mutate({ skillId, level });
  };

  const handleRemoveSkill = (skillId: string) => {
    removeSkillMutation.mutate(skillId);
  };

  // Maps skillId -> UserSkillDto for easy lookup
  const userSkillMap = new Map<string, UserSkillDto>();
  userSkills.forEach((us) => {
    userSkillMap.set(us.skillId, us);
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-8 w-8 text-purple-500" /> Engineering Skill Catalog
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Self-assess your engineering skill matrix. Track your competence across development, DevOps, algorithms, and core CS systems.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Skills Added',
            value: userSkills.length,
            color: 'text-purple-400',
          },
          {
            label: 'Advanced Competencies',
            value: userSkills.filter((us) => us.level === 'ADVANCED').length,
            color: 'text-emerald-400',
          },
          {
            label: 'Practitioner Level',
            value: userSkills.filter((us) => us.level === 'INTERMEDIATE').length,
            color: 'text-blue-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-card/15 p-5 backdrop-blur-sm">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">{stat.label}</span>
            <span className={`text-2xl font-bold block mt-1.5 ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programming languages, tools..."
            className="pl-10 bg-white/5 border-white/10 text-white focus:border-purple-500 text-xs py-4.5"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                : 'bg-white/5 border border-white/5 text-muted-foreground hover:text-white'
            }`}
          >
            All Categories
          </button>
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  : 'bg-white/5 border border-white/5 text-muted-foreground hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {loadingCatalog || loadingUserSkills ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading catalog...</p>
        </div>
      ) : catalog.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/20 p-16 text-center text-muted-foreground">
          No skills found matching your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {catalog.map((skill) => {
            const userSkill = userSkillMap.get(skill.id);
            const userLevel = userSkill?.level;
            const subtopics = (skill as any).subtopics || [];

            return (
              <div
                key={skill.id}
                className={`rounded-xl border p-5 bg-card/25 backdrop-blur-sm flex flex-col justify-between transition-all duration-200 ${
                  userLevel
                    ? 'border-purple-500/20 bg-purple-500/[0.02]'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">
                        {skill.category}
                      </span>
                      <h4 className="font-semibold text-sm text-white mt-0.5">{skill.name}</h4>
                    </div>
                    {userLevel && (
                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {userLevel}
                      </span>
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {skill.description}
                    </p>
                  )}

                  {/* Subtopics Checklist Section */}
                  {userSkill && subtopics && subtopics.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Subtopics Progress
                        </span>
                        <span className="text-[10px] text-purple-400 font-semibold">
                          {userSkill.completedSubtopics?.length || 0}/{subtopics.length} Done
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                        {subtopics.map((sub: any) => {
                          const isDone = userSkill.completedSubtopics?.includes(sub.name) ?? false;
                          return (
                            <div
                              key={sub.name}
                              className="flex items-center justify-between p-1.5 rounded bg-white/5 text-[10px] border border-white/5 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() =>
                                    toggleSubtopicMutation.mutate({
                                      skillId: skill.id,
                                      subtopicName: sub.name,
                                      isCompleted: !isDone,
                                    })
                                  }
                                  className="rounded border-white/20 bg-neutral-950 text-purple-500 focus:ring-purple-500 h-3 w-3 cursor-pointer"
                                />
                                <span className={`text-white ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                                  {sub.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                                <span className="bg-white/5 px-1 py-0.5 rounded text-[8px] uppercase">
                                  {sub.difficulty}
                                </span>
                                <span>• {sub.duration}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Self assessment toggles */}
                <div className="border-t border-white/5 mt-4 pt-3.5 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-muted-foreground font-medium">Proficiency:</span>
                  <div className="flex items-center gap-1.5">
                    {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => handleUpdateProficiency(skill.id, lvl)}
                        className={`px-2.5 py-1 rounded text-[9px] font-bold tracking-wide transition-all border ${
                          userLevel === lvl
                            ? 'border-purple-500 bg-purple-500/10 text-white'
                            : 'border-white/5 bg-neutral-900/60 text-muted-foreground hover:text-white hover:border-white/20'
                        }`}
                      >
                        {lvl.charAt(0)}
                      </button>
                    ))}
                    {userLevel && (
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="p-1 rounded border border-white/5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Remove Skill"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
