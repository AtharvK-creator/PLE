'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  Brain, 
  ArrowLeft, 
  Clock, 
  Flame, 
  Award, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  BookOpen, 
  Lightbulb, 
  HelpCircle,
  AlertCircle,
  Star,
  Send,
  LockKeyhole
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function ChallengeFlow() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const challengeId = params.id as string;

  // Timer states
  const [thinkingTime, setThinkingTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  // Form states
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [refWhy, setRefWhy] = useState('');
  const [refAlt, setRefAlt] = useState('');
  const [refAssump, setRefAssump] = useState('');
  const [refFail, setRefFail] = useState('');
  const [refImprov, setRefImprov] = useState('');
  const [refTrade, setRefTrade] = useState('');

  // 2-Stage Submit states
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [reflectionAfter, setReflectionAfter] = useState('');
  const [showReflectionStage, setShowReflectionStage] = useState(false);

  // Progressive Hint States
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [showHint1, setShowHint1] = useState(false);
  const [showHint2, setShowHint2] = useState(false);
  const [showHint3, setShowHint3] = useState(false);

  // Rating state
  const [userRating, setUserRating] = useState(0);

  // Discussion state
  const [discussionComment, setDiscussionComment] = useState('');

  // Track time since load
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive) {
      interval = setInterval(() => {
        setThinkingTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Fetch challenge details
  const { data: challenge, isLoading, error } = useQuery({
    queryKey: ['eyt-challenge', challengeId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/eyt/challenges/${challengeId}`);
      return res.data.data;
    },
  });

  // Discussions Query
  const { data: discussions } = useQuery({
    queryKey: ['eyt-discussions', challengeId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/eyt/challenges/${challengeId}/discussions`);
      return res.data.data;
    },
  });

  // Submit stage 1
  const submitStage1Mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/eyt/challenges/${challengeId}/stage1`, payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setShowReflectionStage(true);
      setTimerActive(false);
      toast({
        title: 'Stage 1 Saved',
        description: 'Answer locked. Please complete the post-submit reflection to reveal your scores.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Submission Failed',
        description: err.response?.data?.message || 'Failed to submit initial solution',
        variant: 'destructive',
      });
    },
  });

  // Submit stage 2
  const submitStage2Mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/eyt/attempts/${attemptId}/stage2`, payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setShowReflectionStage(false);
      queryClient.invalidateQueries({ queryKey: ['eyt-challenge', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['eyt-dashboard'] });
      
      toast({
        title: 'Evaluation Complete!',
        description: `You earned +${data.xpGained} XP!`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Evaluation Failed',
        description: err.response?.data?.message || 'Failed to run final AI evaluation',
        variant: 'destructive',
      });
    },
  });

  // Submit rating
  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      await apiClient.post(`/eyt/challenges/${challengeId}/rate`, { rating });
    },
    onSuccess: () => {
      setUserRating(0);
      queryClient.invalidateQueries({ queryKey: ['eyt-challenge', challengeId] });
      toast({ title: 'Success', description: 'Thank you for rating this challenge!' });
    },
  });

  // Post Discussion comment
  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiClient.post(`/eyt/challenges/${challengeId}/discussions`, { content });
    },
    onSuccess: () => {
      setDiscussionComment('');
      queryClient.invalidateQueries({ queryKey: ['eyt-discussions', challengeId] });
      toast({ title: 'Comment Posted', description: 'Discussion comment added.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Comment Rejected',
        description: err.response?.data?.message || 'Failed to post comment',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="h-10 w-10 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground font-semibold font-sans">Analyzing problem parameters...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive max-w-md mx-auto my-12">
        Failed to load challenge. Ensure the EYT feature flag is enabled.
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStage1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      toast({ title: 'Error', description: 'Please provide your solution.', variant: 'destructive' });
      return;
    }
    if (!refWhy.trim() || !refAlt.trim() || !refAssump.trim() || !refFail.trim() || !refImprov.trim() || !refTrade.trim()) {
      toast({ title: 'Error', description: 'Please complete all reflection questions.', variant: 'destructive' });
      return;
    }

    submitStage1Mutation.mutate({
      submittedAnswer: answer,
      reflectionWhy: refWhy,
      reflectionAlternatives: refAlt,
      reflectionAssumptions: refAssump,
      reflectionFailures: refFail,
      reflectionImprovement: refImprov,
      reflectionTradeoffs: refTrade,
      confidenceLevel: confidence,
      thinkingTimeSeconds: thinkingTime,
    });
  };

  const handleStage2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionAfter.trim()) {
      toast({ title: 'Error', description: 'Please complete the final self-correction question.', variant: 'destructive' });
      return;
    }

    submitStage2Mutation.mutate({
      reflectionAfterSubmission: reflectionAfter,
    });
  };

  const isSolved = challenge.isSolved;
  const attempt = challenge.attempt;
  const isLockActive = thinkingTime < 600; // 10 minutes thinking lock

  // Hint unlock penalty checker
  const handleHintUnlock = (hintNum: 1 | 2 | 3) => {
    const confirmUnlock = window.confirm('Warning: Unlocking a hint will deduct 10% from your final score and XP. Proceed?');
    if (!confirmUnlock) return;

    setHintsUsedCount((prev) => prev + 1);
    if (hintNum === 1) setShowHint1(true);
    if (hintNum === 2) setShowHint2(true);
    if (hintNum === 3) setShowHint3(true);
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto animate-fade-in select-none">
      
      {/* Header Info */}
      <div className="border-b border-border pb-5 space-y-1">
        <Link href="/eyt" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{challenge.title}</h2>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="bg-secondary border border-border text-muted-foreground px-2.5 py-0.5 rounded-full uppercase">
              {challenge.category}
            </span>
            <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full uppercase">
              {challenge.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Problem Scenario */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-3">
        <h3 className="text-base font-extrabold text-foreground">Problem Scenario</h3>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
      </div>

      {/* PHASE 1: SOLVING FLOW */}
      {!isSolved && !showReflectionStage && (
        <form onSubmit={handleStage1Submit} className="space-y-8">
          
          {/* Active Timer Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary/10 border border-border p-4.5 rounded-xl gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Clock className="h-4.5 w-4.5 text-primary animate-pulse" /> Active Thinking Time: {formatTime(thinkingTime)}
            </div>
            {isLockActive ? (
              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                <LockKeyhole className="h-3.5 w-3.5" /> Hints unlocked in {Math.ceil((600 - thinkingTime) / 60)} minutes
              </span>
            ) : (
              <span className="text-[10px] text-emerald-500 font-bold">Hints are available</span>
            )}
          </div>

          {/* Progressive Hint Dropdown */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4">
            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <Lightbulb className="h-4.5 w-4.5 text-amber-500" /> Progressive Hint System
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-border p-3.5 rounded-xl space-y-2">
                <span className="font-bold text-xs text-foreground block">Hint 1 (Basic)</span>
                {showHint1 ? (
                  <p className="text-xs text-muted-foreground leading-normal">{challenge.hint1}</p>
                ) : (
                  <Button 
                    type="button" 
                    disabled={isLockActive}
                    onClick={() => handleHintUnlock(1)}
                    size="sm" 
                    className="w-full text-[10px] h-7 font-bold"
                  >
                    Unlock Hint 1
                  </Button>
                )}
              </div>

              <div className="border border-border p-3.5 rounded-xl space-y-2">
                <span className="font-bold text-xs text-foreground block">Hint 2 (Moderate)</span>
                {showHint2 ? (
                  <p className="text-xs text-muted-foreground leading-normal">{challenge.hint2}</p>
                ) : (
                  <Button 
                    type="button" 
                    disabled={isLockActive || !showHint1}
                    onClick={() => handleHintUnlock(2)}
                    size="sm" 
                    className="w-full text-[10px] h-7 font-bold"
                  >
                    Unlock Hint 2
                  </Button>
                )}
              </div>

              <div className="border border-border p-3.5 rounded-xl space-y-2">
                <span className="font-bold text-xs text-foreground block">Hint 3 (Specific)</span>
                {showHint3 ? (
                  <p className="text-xs text-muted-foreground leading-normal">{challenge.hint3}</p>
                ) : (
                  <Button 
                    type="button" 
                    disabled={isLockActive || !showHint2}
                    onClick={() => handleHintUnlock(3)}
                    size="sm" 
                    className="w-full text-[10px] h-7 font-bold"
                  >
                    Unlock Hint 3
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Solution Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground block">Your Proposed Solution</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Detail your structured solution, logic, and reasoning step-by-step..."
              className="w-full min-h-[160px] rounded-xl border border-border bg-background p-4 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors leading-relaxed"
              required
            />
          </div>

          {/* Confidence Score */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <label className="text-sm font-bold text-foreground block">How confident are you in this solution?</label>
            <div className="flex flex-wrap gap-2">
              {['Very Low', 'Low', 'Medium', 'High', 'Very High'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidence(level)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${
                    confidence === level 
                      ? 'bg-primary border-transparent text-primary-foreground shadow-sm'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary/45'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Reflection Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground border-b border-border pb-2.5">
              Rigor Reflection Questionnaire
            </h3>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Why did you choose this solution?</label>
                <textarea
                  value={refWhy}
                  onChange={(e) => setRefWhy(e.target.value)}
                  placeholder="Explain your core logic path..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">What alternative approaches did you consider or reject?</label>
                <textarea
                  value={refAlt}
                  onChange={(e) => setRefAlt(e.target.value)}
                  placeholder="List alternative methods..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">What assumptions did you make about parameters or environment?</label>
                <textarea
                  value={refAssump}
                  onChange={(e) => setRefAssump(e.target.value)}
                  placeholder="List assumptions made..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Where or under what loads/conditions could this solution fail?</label>
                <textarea
                  value={refFail}
                  onChange={(e) => setRefFail(e.target.value)}
                  placeholder="State edge cases and failure bounds..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">How would you improve this solution if given unlimited resource/time?</label>
                <textarea
                  value={refImprov}
                  onChange={(e) => setRefImprov(e.target.value)}
                  placeholder="List optimization extensions..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">What architectural or logic trade-offs exist in your design?</label>
                <textarea
                  value={refTrade}
                  onChange={(e) => setRefTrade(e.target.value)}
                  placeholder="E.g., Time complexity vs memory usage, safety vs speed..."
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={submitStage1Mutation.isPending}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-10 px-6.5 text-xs"
            >
              {submitStage1Mutation.isPending ? 'Locking solution...' : 'Lock Answer & Proceed to Reflection'}
            </Button>
          </div>

        </form>
      )}

      {/* PHASE 1.5: REFLECTION BEFORE REVEAL STAGE */}
      {showReflectionStage && (
        <form onSubmit={handleStage2Submit} className="space-y-6 max-w-lg mx-auto bg-card border border-border p-6 rounded-xl animate-fade-in">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
            <Brain className="h-5 w-5 text-primary" /> Metacognitive Final Reflection
          </h3>
          <p className="text-xs text-muted-foreground leading-normal">
            Reflecting on your own work increases calibration accuracy and growth mindset. You must complete this step before revealing evaluations.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">If you had one more attempt, what would you improve in your solution?</label>
            <textarea
              value={reflectionAfter}
              onChange={(e) => setReflectionAfter(e.target.value)}
              placeholder="State any immediate self-corrections or parameters you missed..."
              className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3.5 text-xs text-foreground focus:outline-none"
              required
            />
          </div>
          <Button 
            type="submit"
            disabled={submitStage2Mutation.isPending}
            className="w-full font-bold h-10 text-xs"
          >
            {submitStage2Mutation.isPending ? 'Analyzing with MIKE...' : 'Reveal Evaluation Report'}
          </Button>
        </form>
      )}

      {/* PHASE 2: FEEDBACK RESULTS VIEW */}
      {isSolved && attempt && (
        <div className="space-y-8 animate-fade-in">
          {/* Main Score Header */}
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded font-bold uppercase">
                Metacognitive Report Complete
              </span>
              <h3 className="text-xl font-extrabold text-foreground">Critical Thinking Score Card</h3>
              <div className="flex gap-2 justify-center md:justify-start text-[10px] font-semibold text-muted-foreground">
                <span>Time: {formatTime(attempt.thinkingTimeSeconds)}</span>
                <span>• Hints Used: {attempt.hintsUsedCount}</span>
                <span>• Confidence: {attempt.confidenceLevel}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col items-center justify-center border-4 border-primary h-20 w-20 rounded-full">
                <span className="text-2xl font-black text-foreground">{attempt.scoreOverall}</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
              </div>
            </div>
          </div>

          {/* Scores details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Breakdown chart */}
            <div className="bg-card border border-border p-5 rounded-xl space-y-4.5">
              <h4 className="font-extrabold text-sm text-foreground">Dimension Analysis</h4>
              <div className="space-y-3.5">
                {[
                  { label: 'Logical Reasoning (25%)', val: attempt.scoreLogicalReasoning },
                  { label: 'Originality (20%)', val: attempt.scoreOriginality },
                  { label: 'Problem Decomposition (20%)', val: attempt.scoreDecomposition },
                  { label: 'Technical Accuracy (15%)', val: attempt.scoreAccuracy },
                  { label: 'Creativity (10%)', val: attempt.scoreCreativity },
                  { label: 'Reflection (10%)', val: attempt.scoreReflection },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="text-foreground">{item.val}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authenticity card */}
            <div className="space-y-6">
              
              {/* Authenticity Engine Card */}
              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <h4 className="font-extrabold text-sm text-foreground">Thinking Authenticity Assessment</h4>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center border-4 border-emerald-500 h-16 w-16 rounded-full flex-shrink-0">
                    <span className="text-base font-black text-foreground">{attempt.thinkingAuthenticityScore}%</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">
                      {attempt.thinkingAuthenticityScore >= 90 ? 'Highly Authentic Reasoning' :
                       attempt.thinkingAuthenticityScore >= 75 ? 'Strong Independent Thinking' :
                       attempt.thinkingAuthenticityScore >= 60 ? 'Mostly Independent' :
                       attempt.thinkingAuthenticityScore >= 40 ? 'Possible AI Assistance' : 'Heavy AI Dependency'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Authenticity Signal</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-normal bg-secondary/10 p-3.5 rounded border border-border/40">
                  {attempt.thinkingAuthenticityFeedback}
                </p>
              </div>

              {/* Community rating widget */}
              <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                <h4 className="font-extrabold text-sm text-foreground">Rate this challenge</h4>
                <p className="text-xs text-muted-foreground">Help tune our cognitive pipeline. Rate its design depth:</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => rateMutation.mutate(star)}
                      className="text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      <Star className="h-6 w-6" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Locked solution copy */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h4 className="font-bold text-sm text-foreground">Locked Solutions & Metacognitive Reflections</h4>
            <div className="space-y-4 divide-y divide-border/60 text-xs leading-relaxed text-foreground/80">
              <div className="space-y-1">
                <span className="font-bold text-foreground block">Your Solution Answer:</span>
                <p className="whitespace-pre-wrap">{attempt.submittedAnswer}</p>
              </div>
              <div className="pt-3 space-y-1">
                <span className="font-bold text-foreground block">Growth Self-Correction:</span>
                <p className="italic text-foreground/95">"{attempt.reflectionAfterSubmission}"</p>
              </div>
              <div className="pt-3 space-y-1">
                <span className="font-bold text-foreground block">Logic Selection:</span>
                <p>{attempt.reflectionWhy}</p>
              </div>
              <div className="pt-3 space-y-1">
                <span className="font-bold text-foreground block">Rejected Alternatives:</span>
                <p>{attempt.reflectionAlternatives}</p>
              </div>
            </div>
          </div>

          {/* Assessment & Guide */}
          <div className="space-y-6">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
              <Brain className="h-5.5 w-5.5 text-primary" /> MIKE Cognitive Coaching Feedback
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-foreground">Feedback & Insights</h4>
                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="text-foreground/90 font-medium">
                    <span className="text-emerald-500 font-bold">Strengths: </span>{attempt.feedbackStrengths}
                  </div>
                  <div className="text-foreground/90 font-medium pt-1">
                    <span className="text-amber-500 font-bold">Growth Areas: </span>{attempt.feedbackWeaknesses}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-foreground">Hidden assumptions & Perspectives</h4>
                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="text-foreground/90 font-medium">
                    <span className="text-primary font-bold">Assumption: </span>{attempt.hiddenAssumptions}
                  </div>
                  <div className="text-foreground/90 font-medium pt-1">
                    <span className="text-primary font-bold">Angle: </span>{attempt.alternativePerspective}
                  </div>
                </div>
              </div>
            </div>

            {/* Study Guide details */}
            <div className="space-y-4 bg-card border border-border p-5 rounded-xl">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-primary" /> Metacognitive Study Guide
              </h4>
              <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
                <div className="space-y-1">
                  <span className="font-bold text-foreground text-xs">Reference Solution:</span>
                  <p className="bg-secondary/20 p-3.5 border border-border/40 rounded leading-relaxed whitespace-pre-wrap">
                    {attempt.referenceSolution}
                  </p>
                </div>
                {attempt.industryPerspective && (
                  <div className="space-y-1 pt-1">
                    <span className="font-bold text-foreground text-xs">Industry Standard Paradigm:</span>
                    <p className="bg-secondary/10 p-3 rounded leading-relaxed">{attempt.industryPerspective}</p>
                  </div>
                )}
                {attempt.interviewPerspective && (
                  <div className="space-y-1 pt-1">
                    <span className="font-bold text-foreground text-xs">Interview Pitching Rubrics:</span>
                    <p className="bg-secondary/10 p-3 rounded leading-relaxed">{attempt.interviewPerspective}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Discussions Section */}
            <div className="bg-card border border-border p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-foreground">Thinking Discussions</h4>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Discussions focus on cognitive trade-offs, approaches, and parameters. Solutions and code blocks sharing will be automatically filtered.
              </p>
              
              {/* Write comment */}
              <form 
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault();
                  if (discussionComment.trim()) postCommentMutation.mutate(discussionComment);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Share your reasoning logic or ask for feedback..."
                  value={discussionComment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscussionComment(e.target.value)}
                  className="h-8.5 text-xs"
                />
                <Button size="sm" type="submit" className="h-8.5 flex items-center gap-1 font-bold text-xs px-4">
                  Post <Send className="h-3 w-3" />
                </Button>
              </form>

              {/* Discussions List */}
              <div className="space-y-3 pt-2">
                {discussions && discussions.length > 0 ? (
                  discussions.map((d: any) => (
                    <div key={d.id} className="border border-border/60 bg-secondary/5 p-3 rounded-lg text-xs leading-relaxed space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                        <span>{d.user.name}</span>
                        <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-foreground/90 font-medium">{d.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No discussion comments posted yet.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
