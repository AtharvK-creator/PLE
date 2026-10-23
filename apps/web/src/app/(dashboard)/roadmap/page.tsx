'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Plus,
  Compass,
  CheckCircle,
  Circle,
  Calendar,
  Layers,
  Loader2,
  Sparkles,
  Archive,
  BookOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoadmapDto, RoadmapStepDto, GenerateRoadmapDto } from '@ple/types';
import { ENGINEERING_BRANCHES, CAREER_GOALS } from '@ple/shared';

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Active roadmap selection
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State for new roadmap
  const [goal, setGoal] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [skillLevel, setSkillLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');

  // Accordion details toggle for roadmap steps
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);

  // Prefill form with profile defaults on mount
  useEffect(() => {
    const userProfile = (user as any)?.profile;
    if (userProfile) {
      setBranch(userProfile.branch);
      setSemester(userProfile.semester);
      setSkillLevel(userProfile.skillLevel as any);
      setGoal(userProfile.careerGoal ? `Become a proficient ${userProfile.careerGoal}` : '');
    }
  }, [user]);

  // Fetch all roadmaps
  const { data: roadmaps = [], isLoading: loadingRoadmaps } = useQuery<RoadmapDto[]>({
    queryKey: ['roadmaps'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: RoadmapDto[] }>('/roadmap');
      return res.data.data;
    },
  });

  // Get active or first roadmap
  const activeRoadmap = roadmaps.find((r) => r.id === activeRoadmapId) || roadmaps.find((r) => r.status === 'ACTIVE') || roadmaps[0];

  useEffect(() => {
    if (activeRoadmapId !== 'new' && activeRoadmap && activeRoadmap.id !== activeRoadmapId) {
      setActiveRoadmapId(activeRoadmap.id);
    }
  }, [activeRoadmap, activeRoadmapId]);

  // Generate Roadmap Mutation
  const generateMutation = useMutation({
    mutationFn: async (dto: GenerateRoadmapDto) => {
      setIsGenerating(true);
      const res = await apiClient.post<{ data: RoadmapDto }>('/roadmap/generate', dto);
      return res.data.data;
    },
    onSuccess: (newRoadmap) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      setActiveRoadmapId(newRoadmap.id);
      toast({
        title: 'Roadmap Generated!',
        description: 'Your AI tutor created a custom engineering learning path.',
      });
      setIsGenerating(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Generation Failed',
        description: err.response?.data?.message || 'Could not generate roadmap',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  // Toggle Step Status Mutation
  const toggleStepMutation = useMutation({
    mutationFn: async ({
      roadmapId,
      stepId,
      isCompleted,
    }: {
      roadmapId: string;
      stepId: string;
      isCompleted: boolean;
    }) => {
      const res = await apiClient.patch<{ data: RoadmapStepDto }>(
        `/roadmap/${roadmapId}/steps/${stepId}`,
        { isCompleted }
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Archive Roadmap Mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/roadmap/${id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      setActiveRoadmapId(null);
      toast({ title: 'Roadmap Archived', description: 'This learning path has been archived.' });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      toast({ title: 'Goal required', description: 'What skill or technology do you want to learn?', variant: 'destructive' });
      return;
    }
    if (!branch) {
      toast({ title: 'Branch required', description: 'Please select your engineering branch.', variant: 'destructive' });
      return;
    }

    generateMutation.mutate({
      goal: goal.trim(),
      branch,
      semester,
      currentSkillLevel: skillLevel,
    });
  };

  const handleToggleStep = (step: RoadmapStepDto) => {
    if (!activeRoadmap) return;
    toggleStepMutation.mutate({
      roadmapId: activeRoadmap.id,
      stepId: step.id,
      isCompleted: !step.isCompleted,
    });
  };

  const toggleExpandStep = (stepId: string) => {
    setExpandedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const completedCount = activeRoadmap?.steps.filter((s) => s.isCompleted).length || 0;
  const totalSteps = activeRoadmap?.steps.length || 0;
  const progressPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 select-none animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Map className="h-8 w-8 text-primary" /> AI Roadmaps
          </h2>
          <p className="text-muted-foreground mt-1.5 text-base leading-relaxed">
            AI-generated structured paths tailored for computer science and engineering coursework.
          </p>
        </div>
        {activeRoadmap && (
          <div className="flex gap-2">
            {roadmaps.length > 1 && (
              <select
                value={activeRoadmapId || activeRoadmap.id}
                onChange={(e) => setActiveRoadmapId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
              >
                {roadmaps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.status.toLowerCase()})
                  </option>
                ))}
              </select>
            )}
            {activeRoadmapId !== 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveRoadmapId('new')}
                className="border-border hover:bg-secondary text-xs text-foreground font-bold rounded-lg"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            )}
          </div>
        )}
      </div>

      {loadingRoadmaps || isGenerating ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-semibold">
            {isGenerating ? 'MIKE is custom-tailoring your curriculum...' : 'Loading your roadmap...'}
          </p>
          {isGenerating && (
            <p className="text-xs text-muted-foreground max-w-xs text-center leading-relaxed">
              Analyzing branch curriculum, semester prerequisites, and career objectives to assemble week-by-week guides...
            </p>
          )}
        </div>
      ) : !activeRoadmap || activeRoadmapId === 'new' ? (
        /* Form to generate roadmap */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pro-card max-w-xl mx-auto space-y-6"
        >
          <div className="text-center space-y-2">
            <Compass className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Generate Learning Path</h3>
            <p className="text-xs text-muted-foreground">
              Define your goal. Our AI Gateway utilizes MIKE to output a week-by-week syllabus.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal" className="text-foreground text-xs font-semibold">Learning Goal</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Master Backend Web Development with NestJS & Redis"
                className="bg-background border-input text-foreground focus:border-primary text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="branch" className="text-foreground text-xs font-semibold">Engineering Branch</Label>
                <select
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  required
                >
                  <option value="" disabled>Select Branch</option>
                  {ENGINEERING_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sem" className="text-foreground text-xs font-semibold">Current Semester</Label>
                <select
                  id="sem"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lvl" className="text-foreground text-xs font-semibold">Prerequisite Experience Level</Label>
              <select
                id="lvl"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="BEGINNER">🐣 Beginner (No background)</option>
                <option value="INTERMEDIATE">💻 Intermediate (Know some languages)</option>
                <option value="ADVANCED">🚀 Advanced (Experienced developer)</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-5 mt-4 flex items-center justify-center gap-2 rounded-lg"
            >
              <Sparkles className="h-4 w-4" /> Generate Curriculum with MIKE
            </Button>
          </form>
        </motion.div>
      ) : (
        /* Roadmap detailed view */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Panel: Progress and Details */}
          <div className="pro-card space-y-4 lg:sticky lg:top-24">
            <div className="space-y-2">
              <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {activeRoadmap.status}
              </span>
              <h3 className="font-extrabold text-foreground text-lg leading-snug">
                {activeRoadmap.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Objective: <span className="text-foreground font-semibold">{activeRoadmap.goal}</span>
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {completedCount} of {totalSteps} milestones complete
                </p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground font-semibold">
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Branch</span>
                  <span className="text-foreground font-bold">{activeRoadmap.branch}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Semester Context</span>
                  <span className="text-foreground font-bold">Semester {activeRoadmap.semester}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {activeRoadmap.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archiveMutation.mutate(activeRoadmap.id)}
                    className="border-border hover:bg-destructive/10 hover:text-destructive text-xs text-foreground font-bold flex-1 rounded-lg"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" /> Archive Path
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Vertical Timeline of Steps */}
          <div className="lg:col-span-2 space-y-4 relative pl-4 border-l border-border">
            {activeRoadmap.steps.map((step, idx) => {
              const isExpanded = expandedSteps.includes(step.id);
              return (
                <div key={step.id} className="relative group pb-4">
                  {/* Timeline point */}
                  <div className="absolute top-1 left-[-22px] z-10 flex h-4.5 w-4.5 items-center justify-center">
                    <button
                      onClick={() => handleToggleStep(step)}
                      disabled={toggleStepMutation.isPending}
                      className="rounded-full bg-background p-0.5 focus:outline-none transition-transform active:scale-95"
                    >
                      {step.isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  </div>

                  {/* Step Card */}
                  <div
                    className={`rounded-lg border px-5 py-4 transition-all duration-200 ${
                      step.isCompleted
                        ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                    }`}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpandStep(step.id)}
                    >
                      <div className="space-y-1 pr-4">
                        <span className="text-[10px] text-primary font-bold tracking-wide uppercase">
                          Week {step.weekNumber} · Month {step.monthNumber}
                        </span>
                        <h4
                          className={`font-bold text-sm leading-snug ${
                            step.isCompleted ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-foreground'
                          }`}
                        >
                          {step.title}
                        </h4>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Expandable details */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3 pt-3 border-t border-border space-y-3"
                        >
                          <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                            {step.description}
                          </p>

                          {/* Skills checklist */}
                          {step.skills.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                                <Layers className="h-3 w-3 text-primary" /> Core Skills Target
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {step.skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="bg-secondary border border-border px-2 py-0.5 rounded text-[9px] text-foreground font-semibold"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <Button
                              size="xs"
                              variant={step.isCompleted ? 'outline' : 'default'}
                              onClick={() => handleToggleStep(step)}
                              className={`text-[10px] font-bold ${
                                step.isCompleted
                                  ? 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                              }`}
                            >
                              {step.isCompleted ? 'Completed' : 'Mark Complete'}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
