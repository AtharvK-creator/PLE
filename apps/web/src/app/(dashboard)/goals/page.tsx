'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Loader2,
  ChevronRight,
  Info,
  Map,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LearningGoalDto, LearningGoalStatus } from '@ple/types';

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<LearningGoalDto | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Fetch Goals
  const { data: goals = [], isLoading } = useQuery<LearningGoalDto[]>({
    queryKey: ['learning-goals'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LearningGoalDto[] }>('/learning-goals');
      return res.data.data;
    },
  });

  // Create Goal Mutation
  const createMutation = useMutation({
    mutationFn: async (newGoal: { title: string; description?: string; targetDate?: string }) => {
      const res = await apiClient.post<{ data: LearningGoalDto }>('/learning-goals', newGoal);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast({ title: 'Goal Created', description: 'Your new learning goal has been added.' });
      closeModal();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create goal',
        variant: 'destructive',
      });
    },
  });

  // Update Goal Mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<LearningGoalDto>;
    }) => {
      const res = await apiClient.patch<{ data: LearningGoalDto }>(`/learning-goals/${id}`, updates);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast({ title: 'Goal Updated', description: 'Your goal has been updated successfully.' });
      closeModal();
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update goal',
        variant: 'destructive',
      });
    },
  });

  // Delete Goal Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/learning-goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast({ title: 'Goal Deleted', description: 'The learning goal has been removed.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete goal',
        variant: 'destructive',
      });
    },
  });

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setTargetDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: LearningGoalDto) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
    };

    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleStatusChange = (goal: LearningGoalDto, newStatus: LearningGoalStatus) => {
    updateMutation.mutate({ id: goal.id, updates: { status: newStatus } });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this learning goal?')) {
      deleteMutation.mutate(id);
    }
  };

  // Group goals by status
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const pausedGoals = goals.filter((g) => g.status === 'PAUSED');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-purple-500" /> Learning Goals
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Set and track concrete milestones for your engineering career.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-95 font-semibold self-start md:self-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your milestones...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/20 p-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Define your first milestone</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Keep yourself accountable. Set clear goals, link them to learning roadmaps, and track your engineering consistency.
          </p>
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-95 font-semibold"
          >
            Create Learning Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Goals Section */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Active Goals ({activeGoals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals Section */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Completed Goals ({completedGoals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused Goals Section */}
          {pausedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Paused Goals ({pausedGoals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pausedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#09090b] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5">
                <h3 className="text-base font-semibold text-white">
                  {editingGoal ? 'Edit Learning Goal' : 'Create Learning Goal'}
                </h3>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-white text-xs">Goal Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Learn System Design Fundamentals"
                    className="bg-white/5 border-white/10 text-white focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-white text-xs">Description (Optional)</Label>
                  <textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details or reference materials..."
                    className="w-full min-h-[80px] rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetDate" className="text-white text-xs">Target Date (Optional)</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-purple-500 [color-scheme:dark]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-white hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-95 font-semibold"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingGoal ? (
                      'Save Changes'
                    ) : (
                      'Add Goal'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Goal Card Component
interface GoalCardProps {
  goal: LearningGoalDto;
  onEdit: (goal: LearningGoalDto) => void;
  onDelete: (id: string) => void;
  onStatusChange: (goal: LearningGoalDto, status: LearningGoalStatus) => void;
}

function GoalCard({ goal, onEdit, onDelete, onStatusChange }: GoalCardProps) {
  const isCompleted = goal.status === 'COMPLETED';
  const isPaused = goal.status === 'PAUSED';

  const formattedDate = goal.targetDate
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(goal.targetDate)
      )
    : null;

  return (
    <motion.div
      layout
      className={`relative rounded-xl border p-5 bg-card/35 backdrop-blur-sm transition-all duration-200 group ${
        isCompleted
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : isPaused
          ? 'border-white/5 opacity-70'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <h4
            className={`font-semibold text-sm truncate ${
              isCompleted ? 'text-emerald-400 line-through' : 'text-white'
            }`}
          >
            {goal.title}
          </h4>
          {goal.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {goal.description}
            </p>
          )}
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1.5">
              <Calendar className="h-3 w-3" />
              <span>Target: {formattedDate}</span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(goal)}
            className="p-1 rounded text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            title="Edit Goal"
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete Goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 mt-4 pt-3.5">
        {/* Roadmap link info */}
        {goal.roadmapId ? (
          <a
            href={`/roadmap/${goal.roadmapId}`}
            className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-medium hover:underline"
          >
            <Map className="h-3 w-3" /> Linked Roadmap
          </a>
        ) : (
          <a
            href="/roadmap"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white hover:underline"
          >
            <Plus className="h-3 w-3" /> Link to Roadmap
          </a>
        )}

        {/* Toggle button */}
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onStatusChange(goal, 'ACTIVE')}
              className="text-[10px] h-6 py-0.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
            >
              Reopen
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onStatusChange(goal, 'ACTIVE')}
                  className="text-[10px] h-6 py-0.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                >
                  <Play className="h-2.5 w-2.5 mr-1" /> Resume
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onStatusChange(goal, 'PAUSED')}
                  className="text-[10px] h-6 py-0.5 border-white/10 text-muted-foreground hover:bg-white/5"
                >
                  <Pause className="h-2.5 w-2.5 mr-1" /> Pause
                </Button>
              )}
              <Button
                size="xs"
                onClick={() => onStatusChange(goal, 'COMPLETED')}
                className="text-[10px] h-6 py-0.5 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold"
              >
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Complete
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
