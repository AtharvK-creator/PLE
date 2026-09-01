'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Loader2,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  History,
  AlertCircle,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuizDto, GenerateQuizDto, SubmitAttemptDto, AttemptResultDto } from '@ple/types';

export default function QuizPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mode state: 'dashboard' | 'taking' | 'result'
  const [mode, setMode] = useState<'dashboard' | 'taking' | 'result'>('dashboard');

  // Quiz generator state
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState<QuizDto | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Active result state
  const [activeResult, setActiveResult] = useState<AttemptResultDto | null>(null);

  // Fetch quizzes and attempts
  const { data: quizzes = [], isLoading: loadingQuizzes } = useQuery<QuizDto[]>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: QuizDto[] }>('/quiz');
      return res.data.data;
    },
  });

  const { data: attempts = [], isLoading: loadingAttempts } = useQuery<any[]>({
    queryKey: ['quiz-attempts'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>('/quiz/attempts');
      return res.data.data;
    },
  });

  // Timer logic for quiz taking
  useEffect(() => {
    if (mode === 'taking' && !timerInterval) {
      const interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else if (mode !== 'taking' && timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [mode, timerInterval]);

  // Generate Quiz Mutation
  const generateMutation = useMutation({
    mutationFn: async (dto: GenerateQuizDto) => {
      setIsGenerating(true);
      const res = await apiClient.post<{ data: QuizDto }>('/quiz/generate', dto);
      return res.data.data;
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setActiveQuiz(quiz);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setSecondsElapsed(0);
      setMode('taking');
      toast({ title: 'Quiz Ready!', description: `Topic: ${quiz.topic}` });
      setIsGenerating(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Could not generate quiz.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  // Submit Quiz Attempt Mutation
  const submitAttemptMutation = useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: SubmitAttemptDto }) => {
      const res = await apiClient.post<{ data: AttemptResultDto }>(`/quiz/${quizId}/attempt`, answers);
      return res.data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActiveResult(result);
      setMode('result');
      toast({ title: 'Quiz Submitted!', description: `Score: ${result.percentage}%` });
    },
    onError: (err: any) => {
      toast({
        title: 'Submission Failed',
        description: err.response?.data?.message || 'Could not submit your quiz answers.',
        variant: 'destructive',
      });
    },
  });

  const handleStartGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({ title: 'Topic required', description: 'What topic do you want to be quizzed on?', variant: 'destructive' });
      return;
    }
    if (!subject.trim()) {
      toast({ title: 'Subject required', description: 'e.g. Computer Science, Mechanical Engineering', variant: 'destructive' });
      return;
    }

    generateMutation.mutate({
      topic: topic.trim(),
      subject: subject.trim(),
      difficulty,
      totalQuestions,
    });
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;

    // Check if any question is unanswered
    const unansweredCount = activeQuiz.questions.length - Object.keys(selectedAnswers).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered questions. Do you still want to submit?`)) {
        return;
      }
    }

    // Format answers array
    const formattedAnswers = activeQuiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selectedAnswers[q.id] || '',
    }));

    submitAttemptMutation.mutate({
      quizId: activeQuiz.id,
      answers: {
        answers: formattedAnswers,
        timeTakenSeconds: secondsElapsed,
      },
    });
  };

  const startQuizFromCatalog = async (quizId: string) => {
    try {
      const res = await apiClient.get<{ data: QuizDto }>(`/quiz/${quizId}`);
      const quiz = res.data.data;
      setActiveQuiz(quiz);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setSecondsElapsed(0);
      setMode('taking');
    } catch {
      toast({ title: 'Error', description: 'Could not fetch quiz details.', variant: 'destructive' });
    }
  };

  // Helper format time
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-purple-500" /> Practice Quizzes
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Challenge yourself with adaptive, AI-generated quizzes designed to test and reinforce core concepts.
        </p>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Generating questions and explanations...</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Our AI Gateway utilizes MIKE to compose customized multiple-choice problems and step-by-step solutions.
          </p>
        </div>
      ) : mode === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Quiz Generator Form */}
          <div className="rounded-xl border border-white/10 bg-card/25 backdrop-blur-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" /> Generate New Quiz
            </h3>
            <form onSubmit={handleStartGenerate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="topic" className="text-white">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Process vs Thread, Dijkstra Algorithm, DNS lookup"
                  className="bg-white/5 border-white/10 text-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-white">Subject Area</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Operating Systems, Computer Networks"
                  className="bg-white/5 border-white/10 text-white text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="diff" className="text-white">Difficulty</Label>
                  <select
                    id="diff"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2.5 text-white focus:outline-none"
                  >
                    <option value="EASY">🐣 Easy</option>
                    <option value="MEDIUM">💻 Medium</option>
                    <option value="HARD">🚀 Hard</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="count" className="text-white">Size</Label>
                  <select
                    id="count"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2.5 text-white focus:outline-none"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-95 font-semibold text-xs py-5 mt-4"
              >
                Generate Practice Quiz
              </Button>
            </form>
          </div>

          {/* Previous Quizzes & Attempt History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Catalog */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-purple-400" /> Generated Quizzes
              </h3>
              {loadingQuizzes ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                </div>
              ) : quizzes.length === 0 ? (
                <div className="border border-white/5 rounded-xl bg-white/5 p-8 text-center text-xs text-muted-foreground">
                  No generated quizzes yet. Use the form on the left to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="rounded-xl border border-white/10 bg-card/25 p-4 hover:border-white/20 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold px-2 py-0.5 rounded-full">
                            {quiz.difficulty}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {quiz.totalQuestions} questions
                          </span>
                        </div>
                        <h4 className="font-semibold text-white text-xs truncate mb-1">
                          {quiz.topic}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">{quiz.subject}</p>
                      </div>
                      <Button
                        size="xs"
                        onClick={() => startQuizFromCatalog(quiz.id)}
                        className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-[10px]"
                      >
                        Start Quiz →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attempt History */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-purple-400" /> Recent Quiz Performance
              </h3>
              {loadingAttempts ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                </div>
              ) : attempts.length === 0 ? (
                <div className="border border-white/5 rounded-xl bg-white/5 p-8 text-center text-xs text-muted-foreground">
                  No completed attempts yet. Start a quiz to see your performance.
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-card/25 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/5 border-b border-white/5 text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Topic</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {attempts.map((a) => (
                        <tr key={a.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                            {a.quiz?.topic || 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-400">
                            {a.percentage}%
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatTime(a.timeTakenSeconds)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-[10px]">
                            {new Date(a.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : mode === 'taking' && activeQuiz ? (
        /* Quiz taking console */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-xl border border-white/10 bg-card/25 p-5 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">
                {activeQuiz.difficulty} · {activeQuiz.subject}
              </span>
              <h3 className="font-semibold text-white leading-tight">{activeQuiz.topic}</h3>
            </div>
            <div className="flex items-center gap-4 text-white font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex-shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatTime(secondsElapsed)}
              </span>
            </div>
          </div>

          {/* Question card */}
          {activeQuiz.questions.map((q, idx) => {
            if (idx !== currentQuestionIndex) return null;
            return (
              <div key={q.id} className="rounded-xl border border-white/10 bg-card/25 p-6 space-y-6">
                {/* Question index and progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Question {idx + 1} of {activeQuiz.questions.length}</span>
                    <span>{Math.round(((idx + 1) / activeQuiz.questions.length) * 100)}% Complete</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${((idx + 1) / activeQuiz.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <h4 className="text-sm font-medium leading-relaxed text-white">
                  {q.questionText}
                </h4>

                {/* Options list */}
                <div className="space-y-3">
                  {q.options.map((opt) => {
                    const isSelected = selectedAnswers[q.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`group rounded-lg border p-4 text-xs cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10 text-white font-medium'
                            : 'border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center font-bold text-[9px] flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'border-purple-400 bg-purple-500 text-white'
                              : 'border-white/10 bg-neutral-900 group-hover:border-white/20'
                          }`}
                        >
                          {opt.optionLabel}
                        </div>
                        <span className="leading-relaxed">{opt.optionText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={handlePrevQuestion}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Previous
            </Button>

            {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
              <Button
                onClick={handleNextQuestion}
                disabled={!selectedAnswers[activeQuiz.questions[currentQuestionIndex].id]}
                className="bg-white hover:bg-white/90 text-black font-semibold"
              >
                Next Question
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuiz}
                disabled={submitAttemptMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-95 text-white font-semibold"
              >
                {submitAttemptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit Test'
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Quiz attempt results */
        <div className="max-w-2xl mx-auto space-y-6">
          {activeResult && (
            <>
              {/* Score header summary */}
              <div className="rounded-xl border border-white/10 bg-card/25 p-6 text-center space-y-4">
                <Trophy className="h-10 w-10 text-amber-400 mx-auto" />
                <div>
                  <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your answers were submitted and analyzed by your AI mentor.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-5 max-w-sm mx-auto text-xs">
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Score</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">
                      {activeResult.score}/{activeResult.totalQuestions}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Percentage</span>
                    <span className="text-lg font-bold text-purple-400 mt-1 block">
                      {activeResult.percentage}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Time</span>
                    <span className="text-lg font-bold text-white mt-1 block">
                      {formatTime(activeResult.timeTakenSeconds)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setMode('dashboard')}
                  className="bg-white hover:bg-white/90 text-black font-semibold text-xs"
                >
                  Return to Dashboard
                </Button>
              </div>

              {/* Step-by-step Review */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Answer Key & Review
                </h3>

                {activeResult.answers.map((answer, index) => {
                  return (
                    <div
                      key={answer.questionId}
                      className={`rounded-xl border px-5 py-4 space-y-4 bg-card/25 backdrop-blur-sm ${
                        answer.isCorrect ? 'border-emerald-500/25' : 'border-red-500/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <span className="font-semibold text-white flex-shrink-0">
                          Q{index + 1}.
                        </span>
                        <p className="font-medium text-white flex-1 leading-relaxed">
                          {answer.questionText}
                        </p>
                        <div className="flex-shrink-0">
                          {answer.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Explanation box */}
                      {answer.explanation && (
                        <div className="rounded-lg bg-white/5 border border-white/5 p-3.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                          <AlertCircle className="h-4.5 w-4.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-white block mb-1">
                              {answer.isCorrect ? 'Correct Answer' : 'Explanation'}
                            </span>
                            <p className="text-[11px] leading-relaxed">{answer.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
