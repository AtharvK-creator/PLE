'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, User, GraduationCap, Target, Heart, ArrowRight, ArrowLeft, Loader2, Award, Settings, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { UserDto } from '@ple/types';
import {
  ENGINEERING_BRANCHES,
  CAREER_GOALS,
  SEMESTERS,
} from '@ple/shared';

const INTEREST_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
  'React', 'Next.js', 'Node.js', 'Express.js', 'NestJS', 'HTML/CSS', 'REST APIs',
  'Machine Learning', 'Deep Learning', 'Data Analysis', 'TensorFlow', 'PyTorch',
  'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Git', 'Linux',
  'PostgreSQL', 'MongoDB', 'Redis', 'SQL',
  'Microservices', 'API Design', 'System Design',
  'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Networks',
];

const KNOWLEDGE_DOMAINS = [
  'Frontend Development',
  'Backend Development',
  'Mobile App Development',
  'Data Science & ML',
  'DevOps & Cloud',
  'Database Systems',
  'Cybersecurity',
  'System Design',
  'Game Development',
];

const LEARNING_STYLES = [
  { value: 'VISUAL', label: '🎨 Visual (Infographics, Diagrams, Videos)' },
  { value: 'AUDITORY', label: '🎧 Auditory (Lectures, Podcasts, Discussion)' },
  { value: 'READING', label: '📚 Reading/Writing (Docs, Textbook, Code)' },
  { value: 'PRACTICAL', label: '💻 Practical (Building Projects, Coding exercises)' },
  { value: 'MULTIMODAL', label: '🧠 Any of the above which will suit my learning pattern' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [skillLevel, setSkillLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [careerGoal, setCareerGoal] = useState('');
  const [learningStyle, setLearningStyle] = useState('PRACTICAL');
  
  // New Profile Fields
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [domainSkillLevels, setDomainSkillLevels] = useState<Record<string, string>>({});
  const [projectExperience, setProjectExperience] = useState('NONE');
  const [internshipExperience, setInternshipExperience] = useState('NONE');
  const [interviewReadiness, setInterviewReadiness] = useState('LOW');
  
  // Career Awareness Answers
  const [q1Confidence, setQ1Confidence] = useState('LOW');
  const [q2Plan, setQ2Plan] = useState('NO');

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Load user name on mount if exists
  useEffect(() => {
    if (user?.email && !name) {
      const defaultName = user.email.split('@')[0];
      setName(defaultName.charAt(0).toUpperCase() + defaultName.slice(1));
    }
  }, [user, name]);

  const { data: userProfile, isLoading: loadingProfile } = useQuery<UserDto>({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserDto }>('/users/me');
      return res.data.data;
    },
    retry: 1,
  });

  const [isPrepopulated, setIsPrepopulated] = useState(false);

  useEffect(() => {
    if (!loadingProfile && userProfile) {
      const hasProfile = userProfile.profile;
      const isComplete = !!(hasProfile && hasProfile.branch !== '' && hasProfile.careerGoal !== '');
      if (isComplete) {
        router.push('/dashboard');
      } else if (hasProfile && !isPrepopulated) {
        if (hasProfile.name) setName(hasProfile.name);
        if (hasProfile.bio) setBio(hasProfile.bio);
        if (hasProfile.branch) setBranch(hasProfile.branch);
        if (hasProfile.semester) setSemester(hasProfile.semester);
        if (hasProfile.skillLevel) setSkillLevel(hasProfile.skillLevel);
        if (hasProfile.careerGoal) setCareerGoal(hasProfile.careerGoal);
        if (hasProfile.learningStyle) setLearningStyle(hasProfile.learningStyle);
        if (hasProfile.knowledgeDomains) setSelectedDomains(hasProfile.knowledgeDomains);
        if (hasProfile.domainSkillLevels) setDomainSkillLevels(hasProfile.domainSkillLevels as Record<string, string>);
        if (hasProfile.projectExperience) setProjectExperience(hasProfile.projectExperience);
        if (hasProfile.internshipExperience) setInternshipExperience(hasProfile.internshipExperience);
        if (hasProfile.interviewReadiness) setInterviewReadiness(hasProfile.interviewReadiness);
        if (hasProfile.careerAwarenessAnswers) {
          const answers = hasProfile.careerAwarenessAnswers as Record<string, string>;
          if (answers.confidenceInArchitecture) setQ1Confidence(answers.confidenceInArchitecture);
          if (answers.hasPlacementPlan) setQ2Plan(answers.hasPlacementPlan);
        }
        if (hasProfile.interests && hasProfile.interests.length > 0) {
          setSelectedInterests(hasProfile.interests.map((i: any) => i.topic));
        }
        setIsPrepopulated(true);
      }
    }
  }, [userProfile, loadingProfile, router, isPrepopulated]);

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter your name to proceed.',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2 && !branch) {
      toast({
        title: 'Branch is required',
        description: 'Please select your engineering branch.',
        variant: 'destructive',
      });
      return;
    }
    if (step === 3 && !careerGoal) {
      toast({
        title: 'Career Goal is required',
        description: 'Please select your primary career goal.',
        variant: 'destructive',
      });
      return;
    }
    if (step === 4 && selectedDomains.length === 0) {
      toast({
        title: 'Select at least one domain',
        description: 'Please pick at least one knowledge domain to customize.',
        variant: 'destructive',
      });
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) => {
      const next = prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain];
      
      // Initialize level if new
      if (next.includes(domain) && !domainSkillLevels[domain]) {
        setDomainSkillLevels(prevLevels => ({
          ...prevLevels,
          [domain]: 'BEGINNER',
        }));
      }
      return next;
    });
  };

  const handleDomainLevelChange = (domain: string, val: string) => {
    setDomainSkillLevels(prev => ({
      ...prev,
      [domain]: val,
    }));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (selectedInterests.length < 3) {
      toast({
        title: 'Select more interests',
        description: 'Please select at least 3 topics of interest.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update Profile details
      const profilePayload = {
        name,
        branch,
        semester,
        skillLevel,
        careerGoal,
        bio: bio.trim() || undefined,
        learningStyle,
        knowledgeDomains: selectedDomains,
        domainSkillLevels,
        projectExperience,
        internshipExperience,
        interviewReadiness,
        careerAwarenessAnswers: {
          confidenceInArchitecture: q1Confidence,
          hasPlacementPlan: q2Plan,
        },
      };

      await apiClient.patch('/users/me/profile', profilePayload);

      // 2. Update Interests
      const interestsRes = await apiClient.patch('/users/me/interests', {
        topics: selectedInterests,
      });

      const updatedUser = interestsRes.data.data;
      const storedTokens = useAuthStore.getState();
      if (storedTokens.accessToken && storedTokens.refreshToken) {
        setAuth(updatedUser, storedTokens.accessToken, storedTokens.refreshToken);
      }

      toast({
        title: 'Welcome to MIKE!',
        description: 'Your Student Intelligence Profile has been successfully created.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Onboarding failed',
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile && !isPrepopulated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Checking profile status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 relative overflow-hidden select-none">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-8 shadow-md relative">
        {/* Progress bar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Student Intelligence Profiling</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Step {step} of 6
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '16.66%' }}
            animate={{ width: `${step * 16.66}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" /> Welcome! Let's get started
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Tell us about yourself. MIKE will customize your mentoring topics based on this.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground text-sm">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-background border-border text-foreground text-base focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground text-sm">Bio (Optional)</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell MIKE about your learning journey or interests..."
                  className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  maxLength={500}
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {bio.length}/500
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary" /> Educational Background
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Tell us about your college details so we can align curriculum prerequisites.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch" className="text-foreground text-sm">Engineering Branch</Label>
                <select
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                >
                  <option value="" disabled>Select your branch</option>
                  {ENGINEERING_BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-foreground text-sm">Current Semester</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SEMESTERS.map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setSemester(sem)}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                        semester === sem
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      Sem {sem}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" /> Career Path & Learning Style
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  How do you learn best, and what is your career target?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="career" className="text-foreground text-sm">Career Goal</Label>
                <select
                  id="career"
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                >
                  <option value="" disabled>Select your goal</option>
                  {CAREER_GOALS.map((cg) => (
                    <option key={cg} value={cg}>{cg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style" className="text-foreground text-sm">Learning Style Preference</Label>
                <select
                  id="style"
                  value={learningStyle}
                  onChange={(e) => setLearningStyle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                >
                  {LEARNING_STYLES.map((ls) => (
                    <option key={ls.value} value={ls.value}>{ls.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm">Baseline Skill Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSkillLevel(lvl)}
                      className={`py-3 rounded-lg border text-xs font-bold tracking-wider transition-all ${
                        skillLevel === lvl
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Award className="h-6 w-6 text-primary" /> Knowledge Domains & Levels
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Select your active domains and select your specific skill levels for each.
                </p>
              </div>

              {/* Domains Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1 border border-border p-2 rounded-lg bg-background custom-scrollbar">
                {KNOWLEDGE_DOMAINS.map((domain) => {
                  const isSelected = selectedDomains.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleDomain(domain)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-primary border-transparent text-primary-foreground' : 'border-border'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      {domain}
                    </button>
                  );
                })}
              </div>

              {/* Levels Mapper */}
              {selectedDomains.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  <Label className="text-foreground text-xs block mb-1">Set Skill Levels for Selected Domains:</Label>
                  {selectedDomains.map((domain) => (
                    <div key={domain} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-secondary/40 text-xs border border-border">
                      <span className="text-foreground font-semibold">{domain}</span>
                      <select
                        value={domainSkillLevels[domain] || 'BEGINNER'}
                        onChange={(e) => handleDomainLevelChange(domain, e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-xs text-primary font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" /> Experience & Interview Readiness
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Share your development experience to evaluate your career preparedness.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="projExp" className="text-foreground text-xs">Project Experience</Label>
                  <select
                    id="projExp"
                    value={projectExperience}
                    onChange={(e) => setProjectExperience(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="NONE">None</option>
                    <option value="BEGINNER">Beginner (1-2 projects)</option>
                    <option value="INTERMEDIATE">Intermediate (Hackathons/Web Apps)</option>
                    <option value="ADVANCED">Advanced (Production-grade)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="intExp" className="text-foreground text-xs">Internship Experience</Label>
                  <select
                    id="intExp"
                    value={internshipExperience}
                    onChange={(e) => setInternshipExperience(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="NONE">None</option>
                    <option value="BEGINNER">Minor/Freelance</option>
                    <option value="INTERMEDIATE">Summer Internship</option>
                    <option value="ADVANCED">Full-time Coop/Multiple Internships</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="intReadiness" className="text-foreground text-xs">Interview Readiness Self-Assessment</Label>
                <select
                  id="intReadiness"
                  value={interviewReadiness}
                  onChange={(e) => setInterviewReadiness(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="LOW">Low (Need practice on basics/coding)</option>
                  <option value="MEDIUM">Medium (Can solve basic DSA/System Design)</option>
                  <option value="HIGH">High (Ready for top tech company loops)</option>
                </select>
              </div>

              {/* Career awareness questions */}
              <div className="space-y-3 pt-3 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Career Awareness Questions</h4>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px]">How confident are you explaining system architecture?</Label>
                  <div className="flex gap-2">
                    {['LOW', 'MEDIUM', 'HIGH'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQ1Confidence(opt)}
                        className={`flex-1 py-1.5 rounded border text-[10px] font-bold transition-all ${
                          q1Confidence === opt
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[11px]">Do you have a clear plan for your placement preparation?</Label>
                  <div className="flex gap-2">
                    {['YES', 'NO', 'SOMEWHAT'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQ2Plan(opt)}
                        className={`flex-1 py-1.5 rounded border text-[10px] font-bold transition-all ${
                          q2Plan === opt
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Heart className="h-6 w-6 text-primary" /> Choose Areas of Interest
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Select at least 3 topics to personalize your dashboard recommendations.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar border border-border p-3 rounded-lg bg-background">
                {INTEREST_OPTIONS.map((opt) => {
                  const isSelected = selectedInterests.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleInterest(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary border-transparent text-primary-foreground shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs flex items-center justify-between text-muted-foreground">
                <span>Selected: {selectedInterests.length} topics</span>
                <span>Minimum: 3 topics</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="border-border hover:bg-secondary text-foreground text-xs font-semibold"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedInterests.length < 3}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center text-xs h-9"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

