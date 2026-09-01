'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  Settings,
  User,
  GraduationCap,
  Target,
  Heart,
  Loader2,
  Save,
  CheckCircle,
  Award,
  FileText,
  RefreshCw,
  Copy,
  Printer,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Check,
  ChevronRight,
  ShieldAlert,
  Download,
  Trash2,
  FileCheck,
  AlertTriangle,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserDto, SkillLevel } from '@ple/types';
import { getDeterministicColor, getInitials, cn } from '@/lib/utils';
import {
  ENGINEERING_BRANCHES,
  CAREER_GOALS,
  SEMESTERS,
} from '@ple/shared';

// Standard mock interests
const INTEREST_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
  'React', 'Next.js', 'Node.js', 'Express.js', 'NestJS', 'HTML/CSS', 'REST APIs',
  'Machine Learning', 'Deep Learning', 'Data Analysis', 'TensorFlow', 'PyTorch',
  'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Git', 'Linux',
  'PostgreSQL', 'MongoDB', 'Redis', 'SQL',
  'Microservices', 'API Design', 'System Design',
  'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Networks',
];

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
  };
  skills: {
    total: number;
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user: authUser, setAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'interests' | 'resume' | 'insights' | 'appearance'>('profile');

  // Form State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('BEGINNER');
  const [careerGoal, setCareerGoal] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Avatar states
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperZoom, setCropperZoom] = useState(1);
  const [cropperPos, setCropperPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Mouse & Touch events for profile picture cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropperPos.x,
      y: e.clientY - cropperPos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropperPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - cropperPos.x,
        y: touch.clientY - cropperPos.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropperPos({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Appearance & Theme State
  const [fontSize, setFontSize] = useState('17px');
  const [notifyRoadmap, setNotifyRoadmap] = useState(true);
  const [notifyQuiz, setNotifyQuiz] = useState(true);
  const [notifyNews, setNotifyNews] = useState(false);

  // Fetch full user profile
  const { data: userProfile, isLoading, isError } = useQuery<UserDto>({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserDto }>('/users/me');
      return res.data.data;
    },
  });

  useEffect(() => {
    setAvatarError(false);
  }, [userProfile?.profile?.avatarUrl]);

  // Fetch dashboard statistics for Resume Insights
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardStats }>('/dashboard');
      return res.data.data;
    },
  });

  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001';
    if (path.includes('?v=')) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}${path}?v=${userProfile?.profile?.updatedAt ? new Date(userProfile.profile.updatedAt).getTime() : Date.now()}`;
  };

  // Populate form state when user profile is fetched
  useEffect(() => {
    if (userProfile && userProfile.profile && !isInitialized) {
      setName(userProfile.profile.name);
      setBio(userProfile.profile.bio ?? '');
      setBranch(userProfile.profile.branch);
      setSemester(userProfile.profile.semester);
      setSkillLevel(userProfile.profile.skillLevel);
      setCareerGoal(userProfile.profile.careerGoal);
      setSelectedInterests(userProfile.profile.interests.map((i) => i.topic));
      setIsInitialized(true);
    }
  }, [userProfile, isInitialized]);

  // Read persisted font size
  useEffect(() => {
    const savedFontSize = localStorage.getItem('ple-font-size') || '17px';
    setFontSize(savedFontSize);
  }, []);

  // Listen to external tab navigation events (e.g. from AppHeader dropdown)
  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (['profile', 'interests', 'resume', 'insights', 'appearance'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('set-settings-tab', handleSetTab);
    return () => window.removeEventListener('set-settings-tab', handleSetTab);
  }, []);

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('ple-font-size', size);
    document.documentElement.style.fontSize = size;
    toast({ title: 'Font Size Updated', description: `Default text scale updated to ${size}.` });
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      name: string;
      branch: string;
      semester: number;
      skillLevel: SkillLevel;
      careerGoal: string;
      bio?: string;
    }) => {
      const res = await apiClient.patch<{ data: UserDto }>('/users/me/profile', updates);
      return res.data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      const storedTokens = useAuthStore.getState();
      if (storedTokens.accessToken && storedTokens.refreshToken) {
        setAuth(updatedUser, storedTokens.accessToken, storedTokens.refreshToken);
      }
      if (updatedUser.profile) {
        setName(updatedUser.profile.name);
        setBio(updatedUser.profile.bio ?? '');
        setBranch(updatedUser.profile.branch);
        setSemester(updatedUser.profile.semester);
        setSkillLevel(updatedUser.profile.skillLevel);
        setCareerGoal(updatedUser.profile.careerGoal);
      }
      setIsEditingProfile(false);
      toast({ title: 'Profile Updated', description: 'Your profile details have been saved.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  // Update Interests Mutation
  const updateInterestsMutation = useMutation({
    mutationFn: async (topics: string[]) => {
      const res = await apiClient.patch<{ data: UserDto }>('/users/me/interests', { topics });
      return res.data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      const storedTokens = useAuthStore.getState();
      if (storedTokens.accessToken && storedTokens.refreshToken) {
        setAuth(updatedUser, storedTokens.accessToken, storedTokens.refreshToken);
      }
      if (updatedUser.profile) {
        setSelectedInterests(updatedUser.profile.interests.map((i) => i.topic));
      }
      toast({ title: 'Interests Saved', description: 'Your personalized interests have been updated.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || 'Failed to save interests',
        variant: 'destructive',
      });
    },
  });

  // Regenerate Resume Mutation
  const regenerateResumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: UserDto }>('/users/me/resume/regenerate');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      toast({ title: 'Resume Updated', description: 'MIKE AI has analyzed your milestones and updated your resume.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Regeneration Failed',
        description: err.response?.data?.message || 'Failed to generate resume.',
        variant: 'destructive',
      });
    },
  });

  const copyMarkdown = () => {
    if (!userProfile?.profile?.resume) return;
    const resume = userProfile.profile.resume;
    const md = `
# ${userProfile.profile.name}
**Branch:** ${userProfile.profile.branch} | **Semester:** ${userProfile.profile.semester}
**Career Goal:** ${userProfile.profile.careerGoal}

## Professional Summary
${resume.summary}

## Technical Skills
- **Languages:** ${resume.technicalSkills?.languages?.join(', ') || 'None'}
- **Frameworks & Tools:** ${resume.technicalSkills?.frameworksTools?.join(', ') || 'None'}
- **Core Concepts:** ${resume.technicalSkills?.concepts?.join(', ') || 'None'}

## Experience
### ${resume.experience?.[0]?.role || 'Software Engineering Student'}
*${resume.experience?.[0]?.organization || 'Personalized Learning Empowerment (PLE)'}* (${resume.experience?.[0]?.period || 'Present'})
${resume.experience?.[0]?.bullets?.map((b: string) => `- ${b}`).join('\n') || ''}

## Projects
### ${resume.projects?.[0]?.title || 'Technical Roadmap Project'}
${resume.projects?.[0]?.description || ''}

## Key Milestones & Achievements
${resume.milestones?.map((m: string) => `- ${m}`).join('\n') || ''}
    `.trim();

    navigator.clipboard.writeText(md);
    toast({ title: 'Copied to Clipboard', description: 'Resume copied in Markdown format.' });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!branch) {
      toast({ title: 'Error', description: 'Branch is required', variant: 'destructive' });
      return;
    }
    if (!careerGoal) {
      toast({ title: 'Error', description: 'Career goal is required', variant: 'destructive' });
      return;
    }

    updateProfileMutation.mutate({
      name: name.trim(),
      branch,
      semester,
      skillLevel,
      careerGoal,
      bio: bio.trim() || undefined,
    });
  };

  const handleInterestsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInterests.length < 3) {
      toast({
        title: 'Select more topics',
        description: 'Please select at least 3 topics of interest.',
        variant: 'destructive',
      });
      return;
    }
    updateInterestsMutation.mutate(selectedInterests);
  };

  const toggleInterest = (topic: string) => {
    setSelectedInterests((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // File selection & validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadError('');

    // Limit formats to: jpg, jpeg, png, webp
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Supported formats: jpg, jpeg, png, webp');
      return;
    }

    // Limit size to 5 MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File is too large. Maximum size is 5 MB');
      return;
    }

    // Load file as data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result as string);
      setCropperZoom(1);
      setCropperPos({ x: 0, y: 0 });
      setShowCropper(true);

      // Pre-load image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Perform cropping & WebP compression & Upload
  const handleCropAndSave = () => {
    if (!originalImage) return;

    setIsUploading(true);
    setUploadProgress(10);

    const img = new Image();
    img.onload = () => {
      const W = 240; // cropper display size
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Calculate scaling
        const baseScale = Math.max(W / img.naturalWidth, W / img.naturalHeight);
        const drawScale = 512 / W;

        // Apply same transforms as UI preview
        ctx.scale(drawScale, drawScale);
        ctx.translate(W / 2 + cropperPos.x, W / 2 + cropperPos.y);
        ctx.scale(baseScale * cropperZoom, baseScale * cropperZoom);
        
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      }

      setUploadProgress(40);

      const uploadBlob = async (blob: Blob) => {
        setUploadProgress(70);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'avatar.webp');

          const response = await apiClient.post<{ data: { avatarUrl: string } }>(
            '/users/me/avatar',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            },
          );

          // Invalidate query cache to trigger visual updates
          queryClient.invalidateQueries({ queryKey: ['user-me'] });

          toast({
            title: 'Avatar Updated',
            description: 'Your profile picture has been updated successfully.',
          });

          setShowCropper(false);
          setOriginalImage(null);
        } catch (err: any) {
          setUploadError(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      };

      // Convert to WebP blob with 0.85 quality factor (< 300KB)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadError('Failed to process image');
            setIsUploading(false);
            setUploadProgress(null);
            return;
          }

          if (blob.size > 300 * 1024) {
            canvas.toBlob(
              async (fallbackBlob) => {
                uploadBlob(fallbackBlob || blob);
              },
              'image/webp',
              0.60,
            );
          } else {
            uploadBlob(blob);
          }
        },
        'image/webp',
        0.85,
      );
    };

    img.src = originalImage;
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      await apiClient.delete('/users/me/avatar');
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      toast({
        title: 'Avatar Removed',
        description: 'Your profile picture has been removed.',
      });
    } catch (err: any) {
      toast({
        title: 'Removal Failed',
        description: err.response?.data?.message || 'Failed to remove avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Mock Export Data
  const handleExportData = () => {
    if (!userProfile) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userProfile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ple_profile_${userProfile.profile?.name?.toLowerCase().replace(/ /g, '_') || 'student'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: 'Data Exported', description: 'Your profile JSON has been prepared and downloaded.' });
  };

  // Calculate Resume Strength and ATS Readiness dynamically
  const calculateInsights = () => {
    let score = 15; // Base score
    const details = {
      name: !!name,
      bio: !!bio,
      branch: !!branch,
      semester: !!semester,
      careerGoal: !!careerGoal,
      interests: selectedInterests.length >= 3,
      resume: !!userProfile?.profile?.resume,
      skills: (stats?.skills?.total ?? 0) > 0,
      eyt: (userProfile?.profile?.challengesSolved ?? 0) > 0,
    };

    if (details.name) score += 10;
    if (details.bio) score += 10;
    if (details.branch && details.semester) score += 10;
    if (details.careerGoal) score += 10;
    if (details.interests) score += 15;
    if (details.resume) score += 20;
    if (details.skills) score += 10;
    if (details.eyt) score += 10;

    score = Math.min(score, 100);

    let atsReadiness: 'Low' | 'Medium' | 'High' = 'Low';
    if (score >= 80) atsReadiness = 'High';
    else if (score >= 50) atsReadiness = 'Medium';

    // Career Goal specific data mapping
    const goal = careerGoal || 'Fullstack Developer';
    
    // Core missing skills
    let roleSkills: string[] = [];
    let certifications: string[] = [];
    let projects: string[] = [];

    if (goal.includes('Front') || goal.includes('React')) {
      roleSkills = ['React', 'Next.js', 'TypeScript', 'JavaScript', 'HTML/CSS', 'TailwindCSS', 'Jest'];
      certifications = ['Meta Front-End Developer Certificate', 'FreeCodeCamp Responsive Design'];
      projects = ['Interactive UI Dashboard with Next.js', 'Collaborative Real-time Canvas Tool'];
    } else if (goal.includes('Back') || goal.includes('API')) {
      roleSkills = ['Node.js', 'Express.js', 'PostgreSQL', 'Docker', 'Redis', 'REST APIs', 'System Design'];
      certifications = ['AWS Certified Developer', 'MongoDB Associate Developer'];
      projects = ['Real-time Chat Gateway using NestJS', 'Distributed Task Queue with Redis'];
    } else if (goal.includes('Data Scientist') || goal.includes('Machine') || goal.includes('ML')) {
      roleSkills = ['Python', 'SQL', 'Pandas', 'PyTorch', 'TensorFlow', 'Machine Learning', 'Data Analysis'];
      certifications = ['Google Data Analytics Certificate', 'DeepLearning.AI TensorFlow Certificate'];
      projects = ['Predictive Housing Market Model', 'Text Summarization AI Engine'];
    } else if (goal.includes('DevOps') || goal.includes('Cloud')) {
      roleSkills = ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Git', 'Bash'];
      certifications = ['Docker Certified Associate', 'AWS Cloud Practitioner'];
      projects = ['Automated CI/CD Release Pipeline', 'Infrastructure-as-Code Terraform Repository'];
    } else {
      roleSkills = ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Git', 'System Design'];
      certifications = ['Meta Front-End Developer Certificate', 'AWS Cloud Practitioner'];
      projects = ['Fullstack SaaS Application Boilerplate', 'Educational Portal with concept roadmap'];
    }

    const currentSkillsUpper = (userProfile?.profile?.resume?.technicalSkills?.languages || [])
      .concat(userProfile?.profile?.resume?.technicalSkills?.frameworksTools || [])
      .concat(userProfile?.profile?.resume?.technicalSkills?.concepts || [])
      .concat(selectedInterests)
      .map((s: string) => s.toUpperCase());

    const missingSkills = roleSkills.filter(
      (s) => !currentSkillsUpper.includes(s.toUpperCase())
    );

    // Gap Analysis
    let gapRecommendation = '';
    if (semester <= 3) {
      gapRecommendation = 'Foundational Phase: Focus on core programming (Python/C++), Data Structures, and basic algorithms. Your profile is on track for early-stage conceptual understanding.';
    } else if (semester <= 5) {
      gapRecommendation = 'Transition Phase: Focus on version control (Git), intermediate frameworks (React/Node), and building at least 2 database-connected personal portfolio projects.';
    } else {
      gapRecommendation = 'Pre-placement Phase: You should focus on high-density full-stack projects, system design, mock interviews, and acquiring practical internship or open-source credentials.';
    }

    const gaps: string[] = [];
    if (!details.bio) gaps.push('Profile Bio is empty: Write a professional summary describing your core objectives.');
    if (!details.interests) gaps.push('Topics Gap: Add at least 3 technologies in the Areas of Interest tab.');
    if (!details.resume) gaps.push('Resume Gap: Generate your first AI Resume sheet using MIKE.');
    if (stats && stats.quizzes?.totalAttempts === 0) gaps.push('Verification Gap: Try attempting at least one Practice Quiz to record verified scores.');
    if (!details.eyt) gaps.push('Cognitive Skills Gap: Try completing at least one EYT challenge to verify critical thinking and problem-solving.');

    return {
      score,
      atsReadiness,
      details,
      missingSkills,
      certifications,
      projects,
      gapRecommendation,
      gaps,
    };
  };

  const insights = calculateInsights();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 print:max-w-none print:pb-0 print:space-y-0 print:m-0 animate-fade-in select-none">
      {/* Header Banner */}
      <div className="border-b border-border pb-6 print:hidden">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="h-8 w-8 text-primary" /> Account Settings
        </h2>
        <p className="text-base text-muted-foreground mt-1.5 leading-relaxed">
          Customize your experience, update your education roadmap options, and audit your career readiness.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-base text-muted-foreground">Fetching settings...</p>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          Failed to load account settings. Please refresh.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 items-start print:block">
          {/* Navigation Sidebar (Linear/Notion inspired) */}
          <div className="flex flex-row md:flex-col gap-1 w-full md:w-56 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 border-border print:hidden flex-shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-base font-semibold transition-colors text-left flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-secondary text-foreground font-bold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <User className="h-4 w-4" /> Profile Details
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-base font-semibold transition-colors text-left flex-shrink-0 ${
                activeTab === 'interests'
                  ? 'bg-secondary text-foreground font-bold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Heart className="h-4 w-4" /> Areas of Interest
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-base font-semibold transition-colors text-left flex-shrink-0 ${
                activeTab === 'resume'
                  ? 'bg-secondary text-foreground font-bold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Award className="h-4 w-4" /> Professional Resume
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-base font-semibold transition-colors text-left flex-shrink-0 ${
                activeTab === 'insights'
                  ? 'bg-secondary text-foreground font-bold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <FileCheck className="h-4 w-4" /> Resume Insights
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-base font-semibold transition-colors text-left flex-shrink-0 ${
                activeTab === 'appearance'
                  ? 'bg-secondary text-foreground font-bold border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Settings className="h-4 w-4" /> Theme & Appearance
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="flex-1 w-full rounded-lg border border-border bg-card p-6 shadow-sm print:border-none print:bg-transparent print:p-0 print:w-full print:max-w-none">
            
            {/* Tab 1: Profile Details */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5">
                  Personal Information
                </h3>

                {/* Avatar upload container */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/60">
                  <div className="relative group flex-shrink-0">
                    {/* Circle Container */}
                    <div 
                      className={cn(
                        "w-28 h-28 rounded-full overflow-hidden flex items-center justify-center border border-border shadow-sm text-3xl font-extrabold uppercase select-none",
                        (!userProfile?.profile?.avatarUrl || avatarError) && getDeterministicColor(userProfile?.id).bg,
                        (!userProfile?.profile?.avatarUrl || avatarError) && getDeterministicColor(userProfile?.id).text
                      )}
                    >
                      {userProfile?.profile?.avatarUrl && !avatarError ? (
                        <img 
                          src={getAvatarUrl(userProfile.profile.avatarUrl)} 
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => {
                            setAvatarError(true);
                          }}
                        />
                      ) : (
                        getInitials(name || userProfile?.profile?.name || 'Student')
                      )}
                    </div>

                    {/* Edit Overlay (Visible on hover when editing is active) */}
                    {isEditingProfile && (
                      <label 
                        htmlFor="avatar-file-input"
                        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-semibold"
                      >
                        <Upload className="h-5 w-5" />
                      </label>
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <h4 className="font-bold text-lg text-foreground">Profile Picture</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                      Upload a square image (JPG, PNG, WEBP, max 5MB). The picture will be cropped and compressed to WebP automatically.
                    </p>

                    {isEditingProfile ? (
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1.5">
                        <input
                          id="avatar-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('avatar-file-input')?.click()}
                          className="flex items-center gap-1.5 h-8 px-3 text-xs"
                        >
                          <Upload className="h-3.5 w-3.5" /> Upload Photo
                        </Button>
                        {userProfile?.profile?.avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            className="flex items-center gap-1.5 h-8 px-3 text-xs border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1">
                        Click "Edit Profile" at the bottom to change your picture.
                      </p>
                    )}

                    {uploadError && (
                      <p className="text-xs text-red-500 font-semibold mt-1.5">{uploadError}</p>
                    )}
                  </div>
                </div>

                {/* Email & Role (Read-only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-semibold">Email Address</Label>
                    <Input
                      value={userProfile?.email ?? ''}
                      disabled
                      className="bg-secondary/50 border-border text-muted-foreground cursor-not-allowed select-none text-base h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-sm font-semibold">Account Role</Label>
                    <Input
                      value={userProfile?.role ?? ''}
                      disabled
                      className="bg-secondary/50 border-border text-muted-foreground capitalize cursor-not-allowed select-none text-base h-10"
                    />
                  </div>
                </div>

                {/* Name & Bio */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-foreground text-sm font-semibold">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="bg-background border-border text-foreground text-base h-10 focus-visible:ring-1 focus-visible:ring-primary"
                      required
                      disabled={!isEditingProfile}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bio" className="text-foreground text-sm font-semibold">Bio</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short description about yourself..."
                      className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                      maxLength={500}
                      disabled={!isEditingProfile}
                    />
                    <p className="text-right text-[10px] text-muted-foreground">{bio.length}/500</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5 pt-4">
                  Education & Learning Roadmap Options
                </h3>

                {/* Branch & Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="branch" className="text-foreground text-sm font-semibold">Engineering Branch</Label>
                    <select
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 h-10"
                      disabled={!isEditingProfile}
                    >
                      <option value="" disabled>Select Branch</option>
                      {ENGINEERING_BRANCHES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="semester" className="text-foreground text-sm font-semibold">Current Semester</Label>
                    <select
                      id="semester"
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 h-10"
                      disabled={!isEditingProfile}
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Career Goals & Skill level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="career" className="text-foreground text-sm font-semibold">Career Objective</Label>
                    <select
                      id="career"
                      value={careerGoal}
                      onChange={(e) => setCareerGoal(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 h-10"
                      disabled={!isEditingProfile}
                    >
                      <option value="" disabled>Select Career Goal</option>
                      {CAREER_GOALS.map((cg) => (
                        <option key={cg} value={cg}>{cg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill" className="text-foreground text-sm font-semibold">Technical Skill level</Label>
                    <select
                      id="skill"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 h-10"
                      disabled={!isEditingProfile}
                    >
                      <option value="BEGINNER">🐣 Beginner</option>
                      <option value="INTERMEDIATE">💻 Intermediate</option>
                      <option value="ADVANCED">🚀 Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border mt-6 gap-3">
                  {!isEditingProfile ? (
                    <Button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 h-10"
                    >
                      <Settings className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (userProfile?.profile) {
                            setName(userProfile.profile.name);
                            setBio(userProfile.profile.bio ?? '');
                            setBranch(userProfile.profile.branch);
                            setSemester(userProfile.profile.semester);
                            setSkillLevel(userProfile.profile.skillLevel);
                            setCareerGoal(userProfile.profile.careerGoal);
                          }
                          setIsEditingProfile(false);
                        }}
                        className="text-sm h-10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 h-10"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" /> Save Profile
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            )}

            {/* Tab 2: Areas of Interest */}
            {activeTab === 'interests' && (
              <form onSubmit={handleInterestsSubmit} className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5">
                    Personalized Topics
                  </h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                    Select the key concepts and technologies you want to study. We use these topics to recommend quizzes, learning paths, and tutor conversations.
                  </p>
                </div>

                {/* Interest options grid */}
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border border-border p-4 rounded-lg bg-secondary/20">
                  {INTEREST_OPTIONS.map((opt) => {
                    const isSelected = selectedInterests.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleInterest(opt)}
                        className={`px-4.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
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

                <div className="text-sm flex items-center justify-between text-muted-foreground font-medium">
                  <span>Selected: {selectedInterests.length} topics</span>
                  <span>Minimum: 3 topics</span>
                </div>

                <div className="flex justify-end pt-4 border-t border-border mt-6">
                  <Button
                    type="submit"
                    disabled={updateInterestsMutation.isPending || selectedInterests.length < 3}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 h-10"
                  >
                    {updateInterestsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" /> Update Interests
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 3: Professional Resume */}
            {activeTab === 'resume' && (
              <div className="space-y-6">
                <div className="print:hidden">
                  <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5">
                    Professional AI Resume
                  </h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                    MIKE dynamically tracks your added skills, quiz performance, roadmap progress, and goals to build and compile a technical resume highlighting your active milestones.
                  </p>
                </div>

                {!userProfile?.profile?.resume ? (
                  <div className="rounded-lg border border-dashed border-border p-12 text-center bg-secondary/10">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50 print:hidden" />
                    <h4 className="font-bold text-foreground mb-1 text-base">No Resume Generated Yet</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                      MIKE needs to analyze your profile details and learning history to generate your first technical resume.
                    </p>
                    <Button
                      onClick={() => regenerateResumeMutation.mutate()}
                      disabled={regenerateResumeMutation.isPending}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-10 px-5"
                    >
                      {regenerateResumeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Generate Resume with MIKE
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2 justify-between items-center bg-secondary/50 border border-border p-3 rounded-lg print:hidden">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Last Updated: {new Date(userProfile.profile.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateResumeMutation.mutate()}
                          disabled={regenerateResumeMutation.isPending}
                          className="border-border text-xs h-8 hover:bg-secondary"
                        >
                          {regenerateResumeMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Sync Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyMarkdown}
                          className="border-border text-xs h-8 hover:bg-secondary"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy MD
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.print()}
                          className="border-border text-xs h-8 hover:bg-secondary"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          Print PDF
                        </Button>
                      </div>
                    </div>

                    {/* Resume Sheet */}
                    <div
                      id="resume-print-area"
                      className="rounded-lg border border-border bg-background p-8 space-y-6 text-foreground font-sans max-w-2xl mx-auto shadow-sm relative overflow-hidden print:border-none print:bg-white print:text-black print:p-0 print:shadow-none"
                    >
                      {/* Header */}
                      <div className="border-b border-border pb-5 text-center md:text-left print:border-neutral-200">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
                          {userProfile.profile.name}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 items-center text-xs text-muted-foreground print:text-neutral-600 mt-1 font-medium">
                          <span>{userProfile.profile.branch}</span>
                          <span>•</span>
                          <span>Semester {userProfile.profile.semester}</span>
                        </div>
                        {userProfile.profile.careerGoal && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary print:border-neutral-300 print:text-neutral-700 print:bg-neutral-100 uppercase tracking-wider">
                            Target: {userProfile.profile.careerGoal}
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1 print:border-neutral-200">
                          Professional Summary
                        </h4>
                        <p className="text-xs leading-relaxed text-foreground/90 print:text-neutral-800">
                          {userProfile.profile.resume.summary}
                        </p>
                      </div>

                      {/* Skills Grid */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1 print:border-neutral-200">
                          Technical Competencies
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          {userProfile.profile.resume.technicalSkills?.languages?.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-foreground print:text-black text-[11px]">Languages:</span>
                              <div className="flex flex-wrap gap-1">
                                {userProfile.profile.resume.technicalSkills.languages.map((l: string) => (
                                  <span key={l} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] print:border print:border-neutral-200 print:bg-white text-foreground/90 print:text-black">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {userProfile.profile.resume.technicalSkills?.frameworksTools?.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-foreground print:text-black text-[11px]">Frameworks & Tools:</span>
                              <div className="flex flex-wrap gap-1">
                                {userProfile.profile.resume.technicalSkills.frameworksTools.map((t: string) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] print:border print:border-neutral-200 print:bg-white text-foreground/90 print:text-black">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {userProfile.profile.resume.technicalSkills?.concepts?.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-foreground print:text-black text-[11px]">Core Concepts:</span>
                              <div className="flex flex-wrap gap-1">
                                {userProfile.profile.resume.technicalSkills.concepts.map((c: string) => (
                                  <span key={c} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] print:border print:border-neutral-200 print:bg-white text-foreground/90 print:text-black">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Experience */}
                      {userProfile.profile.resume.experience?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1 print:border-neutral-200">
                            Academic & Technical Development
                          </h4>
                          {userProfile.profile.resume.experience.map((exp: any, i: number) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-start text-xs font-semibold text-foreground print:text-black">
                                <span>{exp.role}</span>
                                <span className="text-muted-foreground text-[10px] font-normal print:text-neutral-500">{exp.period}</span>
                              </div>
                              <p className="text-[10px] text-primary/95 print:text-neutral-700 font-bold uppercase tracking-wider">
                                {exp.organization}
                              </p>
                              <ul className="list-disc pl-4 space-y-1 text-xs text-foreground/90 print:text-neutral-800 mt-1">
                                {exp.bullets?.map((b: string, j: number) => (
                                  <li key={j} className="leading-relaxed text-[11px]">
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Projects */}
                      {userProfile.profile.resume.projects?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1 print:border-neutral-200">
                            Highlighted Projects
                          </h4>
                          {userProfile.profile.resume.projects.map((proj: any, i: number) => (
                            <div key={i} className="space-y-1">
                              <span className="text-xs font-semibold text-foreground print:text-black block">
                                {proj.title}
                              </span>
                              <p className="text-[11px] leading-relaxed text-foreground/80 print:text-neutral-800">
                                {proj.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Milestones */}
                      {userProfile.profile.resume.milestones?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1 print:border-neutral-200">
                            PLE Platform Milestones & Verification
                          </h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-4 text-xs text-foreground/80 print:text-neutral-800">
                            {userProfile.profile.resume.milestones.map((mil: string, i: number) => (
                              <li key={i} className="text-[10px] leading-relaxed">
                                {mil}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Resume Insights Dashboard */}
            {activeTab === 'insights' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" /> Resume Insights Center
                  </h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                    Check your resume strength, ATS score, missing core skills, and academic gap analysis compiled dynamically by MIKE.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Strength Score Ring Card */}
                  <div className="md:col-span-1 rounded-lg border border-border bg-secondary/10 p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-4">Resume Strength</span>
                    
                    <div className="relative flex items-center justify-center h-28 w-28 mb-3">
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className="stroke-secondary"
                          strokeWidth="7"
                          fill="transparent"
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className="stroke-primary"
                          strokeWidth="7"
                          strokeDasharray={`${2 * Math.PI * 48}`}
                          strokeDashoffset={`${2 * Math.PI * 48 * (1 - insights.score / 100)}`}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-foreground">{insights.score}%</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Score</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-base text-foreground">{insights.atsReadiness} ATS Readiness</p>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Based on profile completeness and verified credentials.
                      </p>
                    </div>
                  </div>

                  {/* ATS Checklist Cards */}
                  <div className="md:col-span-2 rounded-lg border border-border bg-card p-5 space-y-4">
                    <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                      <Check className="h-4.5 w-4.5 text-emerald-500" /> ATS Structural Integrity Checks
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {[
                        { label: 'Contact details provided', pass: insights.details.name },
                        { label: 'Branch & educational records', pass: insights.details.branch && insights.details.semester },
                        { label: 'Role objective targets set', pass: insights.details.careerGoal },
                        { label: 'Personal summary configured', pass: insights.details.bio },
                        { label: 'Core competencies selected', pass: insights.details.interests },
                        { label: 'AI compiled resume exists', pass: insights.details.resume },
                        { label: 'Verified platform skill records', pass: insights.details.skills },
                        { label: 'Verified cognitive thinking records', pass: insights.details.eyt },
                        { label: 'Standard ATS header structure', pass: true },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs border border-border/40 p-2 rounded bg-secondary/20">
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center ${
                            item.pass ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className={`font-semibold ${item.pass ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gap Analysis & Missing Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Missing Skills Card */}
                  <div className="rounded-lg border border-border p-5 bg-card space-y-4">
                    <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500" /> Target Role Missing Skills
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      We compared your resume with requirements for **{careerGoal || 'Fullstack Developer'}** roles. Learn these:
                    </p>
                    {insights.missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {insights.missingSkills.map((sk) => (
                          <span key={sk} className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded text-xs font-semibold">
                            + {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-500 font-bold italic">Awesome! You have selected all standard competencies for this role.</p>
                    )}
                  </div>

                  {/* Semester Gap Analysis */}
                  <div className="rounded-lg border border-border p-5 bg-card space-y-4">
                    <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4.5 w-4.5 text-primary" /> Education Gap Analysis
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insights.gapRecommendation}
                    </p>
                    
                    {insights.gaps.length > 0 ? (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Identified Portfolio Gaps:</span>
                        {insights.gaps.map((gp, idx) => (
                          <div key={idx} className="flex gap-2 items-start text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                            <p>{gp}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-500 font-bold pt-2 border-t border-border">
                        🎉 Superb! No major gaps detected. Sync your resume periodically.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recommendations Table */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                  <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> Suggested Career Credentials & Projects
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-4">Credential Type</th>
                          <th className="py-2.5 px-4">Dynamic Suggestions for {careerGoal || 'Fullstack'} Path</th>
                          <th className="py-2.5 px-4">Impact Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 font-bold text-foreground">Certifications</td>
                          <td className="py-3 px-4 space-y-1">
                            {insights.certifications.map((c, i) => (
                              <div key={i} className="font-semibold text-foreground/90">• {c}</div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-emerald-500 font-bold">High (Boosts ATS)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 font-bold text-foreground">Highlighted Projects</td>
                          <td className="py-3 px-4 space-y-1">
                            {insights.projects.map((p, i) => (
                              <div key={i} className="font-semibold text-foreground/90">• {p}</div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-emerald-500 font-bold">Critical (Verified Skill)</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-foreground">Internships & Coops</td>
                          <td className="py-3 px-4 text-foreground/90">
                            Apply for: Software Engineering Internships or contribute to major Open Source libraries.
                          </td>
                          <td className="py-3 px-4 text-emerald-500 font-bold">High (Adds Experience)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions checklist */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <h4 className="font-bold text-base text-foreground">Improvement Checklist</h4>
                  <div className="space-y-2 pt-1 text-xs">
                    {[
                      'Add missing core skills to Areas of Interest',
                      'Request MIKE Tutor for system design / coding interview practice sessions',
                      'Attempt adaptive quizzes on new topics to earn verified certificates',
                      'Sync achievements with professional resume to keep file up to date',
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-center text-foreground/90 font-medium">
                        <input type="checkbox" className="rounded border-border h-4 w-4 accent-primary cursor-pointer" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 5: Theme & Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-foreground border-b border-border pb-2.5">
                    Theme & Appearance Settings
                  </h3>
                  <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                    Personalize your dashboard preferences, typography, notification updates, and account privacy options.
                  </p>
                </div>

                {/* Theme Toggle Select */}
                <div className="space-y-3">
                  <Label className="text-foreground text-sm font-semibold">Color Interface Theme</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { mode: 'light', label: 'Light Theme', desc: 'Clean Notion style', icon: Sun },
                      { mode: 'dark', label: 'Dark Theme', desc: 'Comfortable editor style', icon: Moon },
                      { mode: 'system', label: 'System preference', desc: 'Syncs with device preference', icon: Laptop },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = theme === item.mode;
                      return (
                        <button
                          key={item.mode}
                          type="button"
                          onClick={() => setTheme(item.mode)}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                              : 'border-border bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <Icon className="h-5 w-5" />
                            <span className="font-bold text-base text-foreground">{item.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-normal">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Size Selector */}
                <div className="space-y-3 border-t border-border pt-6">
                  <Label className="text-foreground text-sm font-semibold">Global Typography Font Scale</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { val: '15px', label: 'Small (15px)' },
                      { val: '16px', label: 'Medium (16px)' },
                      { val: '17px', label: 'Standard (17px)' },
                      { val: '18px', label: 'Large (18px)' },
                    ].map((item) => {
                      const isSelected = fontSize === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleFontSizeChange(item.val)}
                          className={`py-3 rounded-lg border text-center font-semibold text-xs tracking-wider transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications Preferences */}
                <div className="space-y-4 border-t border-border pt-6">
                  <Label className="text-foreground text-sm font-semibold">Notification Subscriptions</Label>
                  <div className="space-y-3">
                    {[
                      { label: 'Send email notifications for active roadmap step deadlines', checked: notifyRoadmap, set: setNotifyRoadmap },
                      { label: 'Send reminders for pending practice quizzes', checked: notifyQuiz, set: setNotifyQuiz },
                      { label: 'Subscribe to daily Informative News feed digests', checked: notifyNews, set: setNotifyNews },
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-2.5 items-center text-xs text-foreground/90 font-medium">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.set(e.target.checked)}
                          className="rounded border-border h-4.5 w-4.5 accent-primary cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Actions & Privacy */}
                <div className="space-y-4 border-t border-border pt-6">
                  <Label className="text-foreground text-sm font-semibold">Account Privacy & Verification Control</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={handleExportData}
                      className="bg-secondary border border-border text-foreground hover:bg-secondary/70 text-xs font-semibold h-10 px-4"
                    >
                      <Download className="mr-2 h-4 w-4" /> Export Profile JSON
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={() => {
                        toast({
                          title: 'Action blocked',
                          description: 'Account deletions are managed by institution administrators. Contact administration.',
                          variant: 'destructive',
                        });
                      }}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold h-10 px-4"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Account & Milestones
                    </Button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {showCropper && originalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-bold text-lg text-foreground">Crop Profile Photo</h3>
              <button 
                onClick={() => {
                  setShowCropper(false);
                  setOriginalImage(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cropper area */}
            <div className="flex flex-col items-center justify-center p-6 space-y-6">
              {/* Live circular preview container */}
              <div 
                className="relative w-[240px] h-[240px] rounded-full overflow-hidden border-2 border-primary/40 bg-secondary/30 shadow-md select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={originalImage}
                  alt="Crop preview"
                  style={{
                    transform: `translate(calc(-50% + ${cropperPos.x}px), calc(-50% + ${cropperPos.y}px)) scale(${(imgNaturalSize.w ? Math.max(240 / imgNaturalSize.w, 240 / imgNaturalSize.h || 1) : 1) * cropperZoom})`,
                    left: '50%',
                    top: '50%',
                    position: 'absolute',
                    maxHeight: 'none',
                    maxWidth: 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  draggable={false}
                />
                
                {/* Visual grid / circular overlay guide */}
                <div className="absolute inset-0 pointer-events-none rounded-full border border-primary/20 ring-4 ring-black/40" />
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Zoom</span>
                  <span>{Math.round(cropperZoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={cropperZoom}
                  onChange={(e) => setCropperZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {uploadProgress !== null && (
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Compressing & uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="border-t border-border p-4 bg-secondary/10 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCropper(false);
                  setOriginalImage(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCropAndSave}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Apply & Save'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
