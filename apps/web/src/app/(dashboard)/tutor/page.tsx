'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Briefcase,
  Trophy,
  Milestone,
  BookOpen,
  Terminal,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { LearningSessionDto, MessageDto, SendMessageDto } from '@ple/types';

const MarkdownRenderer = dynamic(() => import('./markdown-renderer'), {
  loading: () => <div className="animate-pulse bg-muted/20 h-10 w-full rounded" />,
  ssr: false,
});

function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children) return extractText(node.props.children);
  return '';
}

function stripPrefixFromChildren(children: any, regex: RegExp): any {
  if (!children) return children;
  if (typeof children === 'string') {
    return children.replace(regex, '');
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    const newChildren = [...children];
    for (let i = 0; i < newChildren.length; i++) {
      const stripped = stripPrefixFromChildren(newChildren[i], regex);
      if (stripped !== newChildren[i]) {
        newChildren[i] = stripped;
        break;
      }
    }
    return newChildren;
  }
  if (children.props && children.props.children) {
    return {
      ...children,
      props: {
        ...children.props,
        children: stripPrefixFromChildren(children.props.children, regex)
      }
    };
  }
  return children;
}

function matchCalloutPrefix(text: string) {
  const patterns = [
    {
      regex: /^(?:[*_#\s]*)(?:🟢\s*Tip|TIP)(?:[*_#\s:]*)\s*/i,
      type: 'tip'
    },
    {
      regex: /^(?:[*_#\s]*)(?:🟡\s*Important|IMPORTANT)(?:[*_#\s:]*)\s*/i,
      type: 'important'
    },
    {
      regex: /^(?:[*_#\s]*)(?:🔴\s*Warning|WARNING)(?:[*_#\s:]*)\s*/i,
      type: 'warning'
    },
    {
      regex: /^(?:[*_#\s]*)(?:🔵\s*Best\s+Practice|BEST\s+PRACTICE)(?:[*_#\s:]*)\s*/i,
      type: 'bestpractice'
    },
    {
      regex: /^(?:[*_#\s]*)(?:🔵\s*Example|EXAMPLE)(?:[*_#\s:]*)\s*/i,
      type: 'example'
    }
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      return p;
    }
  }
  return null;
}

function TipCard({ children }: any) {
  return (
    <div className="my-4 p-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 flex gap-3 items-start shadow-sm transition-colors">
      <Lightbulb className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <strong className="block font-bold mb-1 text-emerald-950 dark:text-white text-xs uppercase tracking-wider">💡 Tip</strong>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function ImportantCard({ children }: any) {
  return (
    <div className="my-4 p-4 rounded-lg border border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300 flex gap-3 items-start shadow-sm transition-colors">
      <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <strong className="block font-bold mb-1 text-amber-950 dark:text-white text-xs uppercase tracking-wider">⚠️ Important</strong>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function WarningCard({ children }: any) {
  return (
    <div className="my-4 p-4 rounded-lg border border-red-500/25 bg-red-500/5 text-red-800 dark:text-red-300 flex gap-3 items-start shadow-sm transition-colors">
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <strong className="block font-bold mb-1 text-red-950 dark:text-white text-xs uppercase tracking-wider">🚨 Warning</strong>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function ExampleCard({ children }: any) {
  return (
    <div className="my-4 p-4 rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-800 dark:text-blue-300 flex gap-3 items-start shadow-sm transition-colors">
      <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <strong className="block font-bold mb-1 text-blue-950 dark:text-white text-xs uppercase tracking-wider">📘 Example</strong>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function BestPracticeCard({ children }: any) {
  return (
    <div className="my-4 p-4 rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-800 dark:text-blue-300 flex gap-3 items-start shadow-sm transition-colors">
      <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <strong className="block font-bold mb-1 text-blue-950 dark:text-white text-xs uppercase tracking-wider">🌟 Best Practice</strong>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ language, code, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border bg-secondary/40 w-full shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary text-xs text-muted-foreground border-b border-border select-none font-sans">
        <span className="uppercase font-mono font-bold tracking-wider text-primary">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors font-semibold"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-sm leading-relaxed max-h-[350px] custom-scrollbar bg-[#09090b] text-[#f4f4f5] dark:bg-black/40">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  p: ({ children, ...props }: any) => {
    const text = extractText(children);
    const match = matchCalloutPrefix(text);
    if (match) {
      const cleanChildren = stripPrefixFromChildren(children, match.regex);
      switch (match.type) {
        case 'tip': return <TipCard>{cleanChildren}</TipCard>;
        case 'important': return <ImportantCard>{cleanChildren}</ImportantCard>;
        case 'warning': return <WarningCard>{cleanChildren}</WarningCard>;
        case 'bestpractice': return <BestPracticeCard>{cleanChildren}</BestPracticeCard>;
        case 'example': return <ExampleCard>{cleanChildren}</ExampleCard>;
      }
    }
    return <p className="mb-4 last:mb-0 leading-relaxed text-base text-foreground/90" {...props}>{children}</p>;
  },
  blockquote: ({ children, ...props }: any) => {
    const text = extractText(children);
    const match = matchCalloutPrefix(text);
    if (match) {
      const cleanChildren = stripPrefixFromChildren(children, match.regex);
      switch (match.type) {
        case 'tip': return <TipCard>{cleanChildren}</TipCard>;
        case 'important': return <ImportantCard>{cleanChildren}</ImportantCard>;
        case 'warning': return <WarningCard>{cleanChildren}</WarningCard>;
        case 'bestpractice': return <BestPracticeCard>{cleanChildren}</BestPracticeCard>;
        case 'example': return <ExampleCard>{cleanChildren}</ExampleCard>;
      }
    }
    return (
      <blockquote className="border-l-4 border-primary/40 pl-4 my-4 italic text-muted-foreground bg-secondary/20 py-2.5 pr-4 rounded-r-md text-base" {...props}>
        {children}
      </blockquote>
    );
  },
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = extractText(children).replace(/\n$/, '');
    
    if (match) {
      return (
        <CodeBlock 
          language={match[1]} 
          code={codeString} 
          className={className} 
          {...props} 
        >
          {children}
        </CodeBlock>
      );
    }
    
    return (
      <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary font-bold" {...props}>
        {children}
      </code>
    );
  },
  table: ({ ...props }: any) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border bg-card w-full shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm" {...props} />
    </div>
  ),
  thead: ({ ...props }: any) => (
    <thead className="bg-secondary" {...props} />
  ),
  tbody: ({ ...props }: any) => (
    <tbody className="divide-y divide-border/60 bg-card" {...props} />
  ),
  tr: ({ ...props }: any) => (
    <tr className="hover:bg-secondary/40 transition-colors" {...props} />
  ),
  th: ({ ...props }: any) => (
    <th className="px-4 py-3 text-left font-bold text-foreground uppercase tracking-wider text-xs" {...props} />
  ),
  td: ({ ...props }: any) => (
    <td className="px-4 py-3 text-foreground/90 whitespace-normal break-words" {...props} />
  ),
  ul: ({ ...props }: any) => (
    <ul className="list-disc pl-5 mb-4 space-y-1.5 text-foreground/90 text-base" {...props} />
  ),
  ol: ({ ...props }: any) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-foreground/90 text-base" {...props} />
  ),
  li: ({ ...props }: any) => (
    <li className="leading-relaxed" {...props} />
  ),
  a: ({ href, children, ...props }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-primary hover:text-primary/80 underline font-semibold transition-colors" 
      {...props}
    >
      {children}
    </a>
  ),
  details: ({ ...props }: any) => (
    <details className="my-4 border border-border rounded-lg bg-card overflow-hidden" {...props} />
  ),
  summary: ({ ...props }: any) => (
    <summary className="px-4 py-2 bg-secondary text-foreground font-semibold text-sm cursor-pointer hover:bg-secondary/80 transition-colors select-none" {...props} />
  )
};

function parseLearningBlocks(markdown: string) {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const sections: { id: string; title: string; type: string; content: string }[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];
  let currentType = 'general';

  const determineType = (title: string) => {
    const t = title.toLowerCase().trim();
    if (t.includes('solution')) return 'solution';
    if (t.includes('complexity')) return 'complexity';
    if (t.includes('best practice')) return 'best_practices';
    if (t.includes('explanation')) return 'explanation';
    if (t.includes('summary') || t.includes('quick answer')) return 'summary';
    if (t.includes('concept')) return 'concepts';
    if (t.includes('industry') || t.includes('career') || t.includes('real-world')) return 'industry';
    if (t.includes('challenge') || t.includes('practice') || t.includes('task')) return 'practice';
    if (t.includes('next step') || t.includes('action plan')) return 'next_steps';
    if (t.includes('code example') || t.includes('code block') || t === 'code') return 'code';
    if (t.includes('example')) return 'example';
    if (t.includes('note') || t.includes('important') || t.includes('warning')) return 'notes';
    if (t.includes('ask') || t.includes('question')) return 'ask_back';
    return 'general';
  };

  for (let line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          id: `sec-${sections.length}-${currentType}`,
          title: currentTitle,
          type: currentType,
          content: currentContent.join('\n').trim()
        });
      }
      currentTitle = headingMatch[2].trim();
      currentType = determineType(currentTitle);
      if (headingMatch[1].length === 1 && currentType === 'general') {
        currentType = 'title';
      }
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0 || currentTitle) {
    sections.push({
      id: `sec-${sections.length}-${currentType}`,
      title: currentTitle,
      type: currentType,
      content: currentContent.join('\n').trim()
    });
  }

  return sections.filter(s => s.content.trim() || s.title.trim());
}

function LearningBlock({ section }: { section: { id: string; title: string; type: string; content: string } }) {
  const getBlockMeta = () => {
    switch (section.type) {
      case 'solution':
        return {
          icon: <CheckCircle2 className="h-4.5 w-4.5 text-blue-500" />,
          bgClass: 'bg-blue-500/5 border-blue-500/25',
          titleColor: 'text-blue-600 dark:text-blue-400',
          badgeText: 'Solution'
        };
      case 'explanation':
        return {
          icon: <Info className="h-4.5 w-4.5 text-muted-foreground" />,
          bgClass: 'bg-secondary/40 border-border',
          titleColor: 'text-foreground',
          badgeText: 'Explanation'
        };
      case 'complexity':
        return {
          icon: <Sparkles className="h-4.5 w-4.5 text-amber-500" />,
          bgClass: 'bg-amber-500/5 border-amber-500/25',
          titleColor: 'text-amber-600 dark:text-amber-400',
          badgeText: 'Complexity Analysis'
        };
      case 'best_practices':
        return {
          icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />,
          bgClass: 'bg-emerald-500/5 border-emerald-500/25',
          titleColor: 'text-emerald-600 dark:text-emerald-400',
          badgeText: 'Best Practices'
        };
      case 'title':
        return {
          icon: <Brain className="h-4.5 w-4.5 text-primary" />,
          bgClass: 'bg-secondary border-border',
          titleColor: 'text-foreground',
          badgeText: 'Overview'
        };
      case 'summary':
        return {
          icon: <Sparkles className="h-4.5 w-4.5 text-primary" />,
          bgClass: 'bg-blue-500/5 border-blue-500/25',
          titleColor: 'text-blue-600 dark:text-blue-400',
          badgeText: 'Summary'
        };
      case 'concepts':
        return {
          icon: <GraduationCap className="h-4.5 w-4.5 text-emerald-500" />,
          bgClass: 'bg-emerald-500/5 border-emerald-500/25',
          titleColor: 'text-emerald-600 dark:text-emerald-400',
          badgeText: 'Key Concepts'
        };
      case 'example':
        return {
          icon: <BookOpen className="h-4.5 w-4.5 text-blue-500" />,
          bgClass: 'bg-blue-500/5 border-blue-500/25',
          titleColor: 'text-blue-600 dark:text-blue-400',
          badgeText: 'Example'
        };
      case 'code':
        return {
          icon: <Terminal className="h-4.5 w-4.5 text-muted-foreground" />,
          bgClass: 'bg-secondary/40 border-border',
          titleColor: 'text-foreground',
          badgeText: 'Code Example'
        };
      case 'industry':
        return {
          icon: <Briefcase className="h-4.5 w-4.5 text-amber-500" />,
          bgClass: 'bg-amber-500/5 border-amber-500/25',
          titleColor: 'text-amber-600 dark:text-amber-400',
          badgeText: 'Career & Industry'
        };
      case 'practice':
        return {
          icon: <Trophy className="h-4.5 w-4.5 text-rose-500" />,
          bgClass: 'bg-rose-500/5 border-rose-500/25',
          titleColor: 'text-rose-600 dark:text-rose-400',
          badgeText: 'Challenge'
        };
      case 'next_steps':
        return {
          icon: <Milestone className="h-4.5 w-4.5 text-blue-500" />,
          bgClass: 'bg-blue-500/5 border-blue-500/25',
          titleColor: 'text-blue-600 dark:text-blue-400',
          badgeText: 'Next Steps'
        };
      case 'ask_back':
        return {
          icon: <MessageSquare className="h-4.5 w-4.5 text-emerald-500" />,
          bgClass: 'bg-emerald-500/5 border-emerald-500/25 shadow-sm',
          titleColor: 'text-emerald-600 dark:text-emerald-400',
          badgeText: 'Tutor Query'
        };
      default:
        return {
          icon: <Info className="h-4.5 w-4.5 text-muted-foreground" />,
          bgClass: 'bg-secondary border-border',
          titleColor: 'text-foreground',
          badgeText: 'Tutor'
        };
    }
  };

  const meta = getBlockMeta();

  if (section.type === 'title') {
    return (
      <div className="border-b border-border pb-3 mb-4 mt-2">
        <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
          {meta.icon}
          {section.title}
        </h2>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-5 shadow-sm transition-all hover:bg-secondary/20 ${meta.bgClass}`}>
      <div className="flex items-center justify-between border-b border-border/10 pb-2.5 mb-4 select-none">
        <div className="flex items-center gap-2">
          {meta.icon}
          <h3 className={`text-[10px] font-bold uppercase tracking-wider ${meta.titleColor}`}>
            {section.title || meta.badgeText}
          </h3>
        </div>
        <span className="text-[9px] font-semibold bg-background px-2 py-0.5 rounded-full border border-border text-muted-foreground uppercase tracking-widest">
          {meta.badgeText}
        </span>
      </div>
      
      <div className="prose-custom max-w-none">
        <MarkdownRenderer 
          components={markdownComponents}
          content={section.content}
        />
      </div>
    </div>
  );
}

function MIKEMessageContent({ content }: { content: string }) {
  const sections = parseLearningBlocks(content);

  if (sections.length <= 1 && sections[0]?.type === 'general') {
    return (
      <div className="prose-custom max-w-none">
        <MarkdownRenderer 
          components={markdownComponents}
          content={content}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {sections.map((section) => (
        <LearningBlock key={section.id} section={section} />
      ))}
    </div>
  );
}

interface SessionListItem {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TutorPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Layout State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Tutor Mode State
  const [selectedMode, setSelectedMode] = useState<'LEARN' | 'CODE'>('LEARN');

  // Pagination State
  const [sessionsPage, setSessionsPage] = useState(1);
  const [allSessions, setAllSessions] = useState<SessionListItem[]>([]);

  // Expert Mode State
  const [expertMode, setExpertMode] = useState(false);

  // Chat input
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // File Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; mimeType: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size allowed is 10MB.', variant: 'destructive' });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Unsupported format', description: 'Please upload a PDF, Word, PowerPoint document, or image.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post<any>('/tutor/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachedFile(res.data.data);
      toast({ title: 'File uploaded', description: `${file.name} is attached.` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || 'Could not upload file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      e.preventDefault();
      const file = files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size allowed is 10MB.', variant: 'destructive' });
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Unsupported format', description: 'Please paste a PDF, Word, PowerPoint, or image.', variant: 'destructive' });
        return;
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await apiClient.post<any>('/tutor/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachedFile(res.data.data);
        toast({ title: 'File pasted & attached', description: `${file.name || 'Pasted file'} is attached.` });
      } catch (err: any) {
        toast({ title: 'Upload failed', description: err.response?.data?.message || 'Could not upload file.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('\n') || pastedText.includes('\r')) {
      e.preventDefault();
      const looksLikeCode = /[{};()\[\]]|\b(function|const|let|var|class|import|def|if|for|while|return|public|void)\b/.test(pastedText);
      
      let formattedText = pastedText;
      if (looksLikeCode) {
        let lang = '';
        if (pastedText.includes('def ') || pastedText.includes('import pandas')) lang = 'python';
        else if (pastedText.includes('const ') || pastedText.includes('console.log')) lang = 'javascript';
        else if (pastedText.includes('class ') && (pastedText.includes('public static void') || pastedText.includes('System.out'))) lang = 'java';
        else if (pastedText.includes('SELECT ') && pastedText.includes('FROM')) lang = 'sql';
        
        formattedText = `\`\`\`${lang}\n${pastedText}\n\`\`\``;
      }
      
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = inputMessage.substring(0, start) + formattedText + inputMessage.substring(end);
      setInputMessage(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
      }, 0);
    }
  };

  // Restore tutor mode preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('mike-tutor-mode');
      if (savedMode === 'LEARN' || savedMode === 'CODE') {
        setSelectedMode(savedMode);
      }
      const savedExpert = localStorage.getItem('mike-tutor-expert-mode');
      if (savedExpert === 'true') {
        setExpertMode(true);
      }
    }
  }, []);

  const handleExpertModeChange = (val: boolean) => {
    setExpertMode(val);
    localStorage.setItem('mike-tutor-expert-mode', String(val));
  };

  // Restore active session ID for selected mode
  useEffect(() => {
    const key = `mike-tutor-active-session-${selectedMode.toLowerCase()}`;
    const savedSessionId = localStorage.getItem(key);
    if (savedSessionId) {
      setActiveSessionId(savedSessionId);
    } else {
      setActiveSessionId(null);
    }
  }, [selectedMode]);

  // Handle active session selection and persist it
  const handleSessionSelect = (id: string | null) => {
    setActiveSessionId(id);
    const key = `mike-tutor-active-session-${selectedMode.toLowerCase()}`;
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  };

  // Handle mode changes and persist preference
  const handleModeChange = (mode: 'LEARN' | 'CODE') => {
    setSelectedMode(mode);
    localStorage.setItem('mike-tutor-mode', mode);
  };

  // Fetch list of sessions with pagination
  const { data: sessionsData, isLoading: loadingSessions, isFetching: fetchingSessions } = useQuery<SessionListItem[]>({
    queryKey: ['tutor-sessions', selectedMode, sessionsPage],
    queryFn: async () => {
      const res = await apiClient.get<{ data: SessionListItem[] }>(
        `/tutor/sessions?mode=${selectedMode}&page=${sessionsPage}&limit=20`
      );
      return res.data.data;
    },
  });

  // Accumulate sessions
  useEffect(() => {
    if (sessionsData) {
      if (sessionsPage === 1) {
        setAllSessions(sessionsData);
      } else {
        setAllSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const uniqueNew = sessionsData.filter((s) => !existingIds.has(s.id));
          return [...prev, ...uniqueNew];
        });
      }
    }
  }, [sessionsData, sessionsPage]);

  // Reset page and list when mode changes
  useEffect(() => {
    setSessionsPage(1);
    setAllSessions([]);
  }, [selectedMode]);

  // Auto-select latest session of this mode if no active session is selected
  useEffect(() => {
    if (allSessions.length > 0 && !activeSessionId) {
      const key = `mike-tutor-active-session-${selectedMode.toLowerCase()}`;
      const savedSessionId = localStorage.getItem(key);
      if (savedSessionId && allSessions.some((s) => s.id === savedSessionId)) {
        setActiveSessionId(savedSessionId);
      } else {
        handleSessionSelect(allSessions[0].id);
      }
    }
  }, [allSessions, activeSessionId, selectedMode]);

  // Fetch active session messages
  const { data: activeSession, isLoading: loadingMessages, error: sessionError } = useQuery<LearningSessionDto>({
    queryKey: ['tutor-session', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) throw new Error('No session selected');
      const res = await apiClient.get<{ data: LearningSessionDto }>(`/tutor/sessions/${activeSessionId}`);
      return res.data.data;
    },
    enabled: !!activeSessionId,
    retry: false,
  });

  // Handle stale activeSessionId (e.g. session deleted or database reset)
  useEffect(() => {
    if (sessionError) {
      const err = sessionError as any;
      if (err.response?.status === 404) {
        handleSessionSelect(null);
      }
    }
  }, [sessionError]);

  // Scroll to bottom when active session changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [activeSessionId]);

  // Conditional scroll during streaming: only auto-scroll if the user is already near the bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isStreaming || !streamingContent) return;

    // Check if user is scrolled near the bottom (within 150px threshold)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isNearBottom) {
      const timeoutId = setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [streamingContent, isStreaming]);

  // Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: LearningSessionDto }>('/tutor/sessions', {
        title: 'New Conversation',
        mode: selectedMode,
      });
      return res.data.data;
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['tutor-sessions'] });
      setSessionsPage(1);
      handleSessionSelect(newSession.id);
      toast({ title: 'New chat created', description: 'Ask your AI tutor anything.' });
    },
  });

  // Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tutor/sessions/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['tutor-sessions'] });
      setSessionsPage(1);
      if (activeSessionId === deletedId) {
        handleSessionSelect(null);
      }
      toast({ title: 'Chat deleted', description: 'Session history has been removed.' });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || isStreaming) return;

    let sessionId = activeSessionId;

    // Create session first if none exists
    if (!sessionId) {
      try {
        const newSession = await createSessionMutation.mutateAsync();
        sessionId = newSession.id;
      } catch (err) {
        toast({ title: 'Error', description: 'Could not start session', variant: 'destructive' });
        return;
      }
    }

    const payload: SendMessageDto & { file?: any } = {
      content: inputMessage.trim() || `Analyze the attached file: ${attachedFile?.name}`,
      expertMode,
      file: attachedFile || undefined,
    };

    setInputMessage('');
    setIsStreaming(true);
    setStreamingContent('');

    // Optimistically add user message to cached list
    queryClient.setQueryData(['tutor-session', sessionId], (old: any) => {
      if (!old) return old;
      const userMsg: MessageDto = {
        id: `optimistic-user-${Date.now()}`,
        role: 'USER',
        content: payload.content,
        createdAt: new Date().toISOString(),
        metadata: (attachedFile ? { attachment: attachedFile } : {}) as any,
      };
      return {
        ...old,
        messages: [...(old.messages || []), userMsg],
      };
    });

    // Scroll to bottom when sending message
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
      let token = useAuthStore.getState().accessToken;
      let response = await fetch(`http://localhost:3001/api/v1/tutor/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        // Token might have expired, attempt silent refresh
        try {
          const refreshRes = await apiClient.post<any>('/auth/refresh');
          const newToken = refreshRes.data.data.tokens.accessToken;
          const newRefreshToken = refreshRes.data.data.tokens.refreshToken;
          useAuthStore.getState().setTokens(newToken, newRefreshToken);
          token = newToken;

          // Retry request with new token
          response = await fetch(`http://localhost:3001/api/v1/tutor/sessions/${sessionId}/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
        } catch (refreshErr) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/auth/login';
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No stream reader');

      let accumulated = '';
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        buffer += textChunk;

        // Process line by line
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            
            let parsed: any = null;
            try {
              parsed = JSON.parse(dataStr);
            } catch (e) {
              console.error('Failed to parse SSE JSON data line:', trimmed, e);
              continue;
            }

            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setStreamingContent(accumulated);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          }
        }
      }

      // Process remaining buffer if any
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.substring(6).trim();
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setStreamingContent(accumulated);
            }
          } catch (e) {
            console.error('Failed to parse remaining SSE data:', trimmed, e);
          }
        }
      }

      // Re-fetch clean database messages
      queryClient.invalidateQueries({ queryKey: ['tutor-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['tutor-sessions'] });
    } catch (err: any) {
      toast({ title: 'Stream error', description: err.message || 'Could not stream response.', variant: 'destructive' });
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setAttachedFile(null);
    }
  };

  const SUGGESTED_PROMPTS = {
    LEARN: [
      { text: "Explain how database indexing works under the hood", label: "DB Indexes" },
      { text: "Explain time complexity of quicksort vs mergesort with examples", label: "Sorting Complexities" },
      { text: "Help me design a study plan for System Design interviews", label: "System Design Guide" },
      { text: "What is zero-trust network security and why is it important?", label: "Zero Trust Security" },
    ],
    CODE: [
      { text: "Debug my code: find and explain the bugs here", label: "Debug My Code" },
      { text: "Optimize this DSA solution for time and space complexity", label: "Optimize DSA Solution" },
      { text: "Help me build a React custom hook with best practices", label: "Build React Project" },
      { text: "Design a REST API interface for a modern chat application", label: "Design REST API" },
    ]
  };

  const hasMore = sessionsData ? sessionsData.length === 20 : false;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'File too large', description: 'Maximum file size allowed is 10MB.', variant: 'destructive' });
          return;
        }
        
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (!allowedTypes.includes(file.type)) {
          toast({ title: 'Unsupported format', description: 'Please drop a PDF, Word, PowerPoint, or image.', variant: 'destructive' });
          return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await apiClient.post<any>('/tutor/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setAttachedFile(res.data.data);
          toast({ title: 'File dropped & attached', description: `${file.name} is attached.` });
        } catch (err: any) {
          toast({ title: 'Upload failed', description: err.response?.data?.message || 'Could not upload file.', variant: 'destructive' });
        } finally {
          setIsUploading(false);
        }
      }}
      className="flex h-[calc(100vh-6.5rem)] rounded-lg border border-border bg-card overflow-hidden relative shadow-sm select-none"
    >
      
      {/* Sessions Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col border-r border-border bg-background h-full overflow-hidden flex-shrink-0"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Conversations
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => createSessionMutation.mutate()}
                aria-label="Create new conversation"
                className="border-border hover:bg-secondary text-xs text-foreground font-semibold"
              >
                <Plus className="h-3 w-3 mr-1" /> New Chat
              </Button>
            </div>

            {/* Session list or Premium Empty State */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-background/30">
              {loadingSessions && allSessions.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-12 space-y-3">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Syncing conversations...</span>
                </div>
              ) : allSessions.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No active {selectedMode.toLowerCase()} chat history. Open a workspace context with MIKE today.
                  </p>
                  <Button
                    size="xs"
                    onClick={() => createSessionMutation.mutate()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    Start Chatting
                  </Button>
                </div>
              ) : (
                <>
                  {allSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-semibold cursor-pointer transition-all ${
                        activeSessionId === s.id
                          ? 'bg-secondary text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                      onClick={() => handleSessionSelect(s.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate pr-2">{s.title}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSessionMutation.mutate(s.id);
                        }}
                        aria-label={`Delete session ${s.title}`}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={fetchingSessions}
                      onClick={() => setSessionsPage((p) => p + 1)}
                      className="w-full text-xs font-semibold py-2.5 hover:bg-secondary border border-dashed border-border mt-3 flex items-center justify-center gap-1.5"
                    >
                      {fetchingSessions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full bg-card min-w-0 relative">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
            </button>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMode}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                {selectedMode === 'LEARN' ? (
                  <Brain className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Terminal className="h-5 w-5 text-primary" />
                )}
                <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1.5">
                  {selectedMode === 'LEARN' ? 'MIKE Learn Mode' : 'MIKE Code Mode'}
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher Toggle */}
            <div className="relative flex p-0.5 bg-background border border-border rounded-lg w-[170px] md:w-[190px] select-none text-xs">
              <div className="absolute top-0.5 bottom-0.5 left-0.5 right-0.5 w-[calc(50%-2px)] z-0">
                <motion.div
                  className="h-full w-full rounded-md shadow-sm border border-border bg-secondary"
                  animate={{
                    x: selectedMode === 'LEARN' ? 0 : '100%',
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              </div>

              <button
                onClick={() => handleModeChange('LEARN')}
                aria-label="Switch to Learn Mode"
                className={`relative z-10 flex-1 py-1 font-bold rounded-md flex items-center justify-center gap-1 transition-colors focus:outline-none ${
                  selectedMode === 'LEARN' ? 'text-primary font-extrabold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🧠 Learn
              </button>

              <button
                onClick={() => handleModeChange('CODE')}
                aria-label="Switch to Code Mode"
                className={`relative z-10 flex-1 py-1 font-bold rounded-md flex items-center justify-center gap-1 transition-colors focus:outline-none ${
                  selectedMode === 'CODE' ? 'text-primary font-extrabold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💻 Code
              </button>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-card">
          {!activeSessionId ? (
            /* Premium Conversation Empty State Dashboard */
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-border bg-background/50 p-8 w-full space-y-5 shadow-sm"
              >
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto shadow-sm">
                  {selectedMode === 'LEARN' ? (
                    <Brain className="h-6 w-6 text-primary-foreground animate-pulse" />
                  ) : (
                    <Terminal className="h-6 w-6 text-primary-foreground" />
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-foreground">
                    {selectedMode === 'LEARN'
                      ? 'MIKE Learn Advisor Workspace'
                      : 'MIKE Code Compiler Assistant'}
                  </h4>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {selectedMode === 'LEARN'
                      ? 'Discuss conceptual software systems, ask placement preparation questions, study coursework guides, or generate quizzes.'
                      : 'Simulate step-by-step algorithms, run code debugging audits, inspect SQL plan performance, or write code.'}
                  </p>
                </div>

                <Button
                  onClick={() => createSessionMutation.mutate()}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs py-5 px-6 shadow-sm"
                >
                  Start New Session
                </Button>

                {/* Suggested Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left">
                  {SUGGESTED_PROMPTS[selectedMode].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(p.text);
                        setTimeout(() => {
                          const form = document.querySelector('form');
                          if (form) form.requestSubmit();
                        }, 50);
                      }}
                      className="flex flex-col text-left p-3.5 rounded-lg border border-border bg-card hover:bg-secondary/40 transition-all text-xs text-foreground font-medium group cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-sm"
                    >
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {p.label}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-2 leading-normal">
                        {p.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : loadingMessages ? (
            /* Skeleton Loading states for message log fetch */
            <div className="h-full flex flex-col justify-center items-center space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Compiling chat logs...</span>
            </div>
          ) : (
            <>
              {activeSession?.messages && activeSession.messages.length === 0 && (
                <div className="rounded-lg border border-border bg-secondary/10 p-6 max-w-lg mx-auto text-center space-y-2 mt-8 select-none">
                  <Sparkles className="h-5 w-5 text-primary mx-auto animate-pulse" />
                  <h4 className="font-bold text-foreground text-sm">Conversation initialized with MIKE</h4>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Enter your question below or click one of the suggested prompts to start.
                  </p>
                </div>
              )}

              {activeSession?.messages?.map((m) => {
                const isUser = m.role === 'USER';
                const hasFallback = m.metadata?.fallbackTriggered;
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-4 max-w-3xl ${
                      isUser ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm ${
                        isUser
                          ? 'bg-primary/10 border border-primary/20 text-primary'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isUser ? <User className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    </div>

                    <div
                      className={`text-base leading-relaxed overflow-x-auto ${
                        isUser
                          ? 'rounded-lg border bg-primary text-primary-foreground px-4 py-3 max-w-[85%] font-semibold shadow-sm'
                          : 'w-full text-foreground'
                      }`}
                    >
                      {isUser ? (
                        <div className="prose-custom max-w-none text-primary-foreground">
                          <MarkdownRenderer 
                            content={m.content}
                            components={{
                              ...markdownComponents,
                              p: ({ children, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-base text-primary-foreground" {...props}>{children}</p>,
                              code: ({ className, children, ...props }: any) => (
                                <code className="bg-white/20 px-1.5 py-0.5 rounded text-sm font-mono text-white font-bold" {...props}>
                                  {children}
                                </code>
                              )
                            }}
                          />
                          {(() => {
                            const attachment = (m.metadata as any)?.attachment;
                            if (!attachment) return null;
                            const isImage = attachment.mimeType?.startsWith('image/');
                            const getFileUrl = (url: string) => {
                              const baseUrl = process.env.NEXT_PUBLIC_API_URL 
                                ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') 
                                : 'http://localhost:3001';
                              return `${baseUrl}${url}`;
                            };
                            return (
                              <div className="mt-2.5 p-2 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 transition-all flex items-center gap-3 select-none">
                                {isImage ? (
                                  <img
                                    src={getFileUrl(attachment.url)}
                                    alt={attachment.name}
                                    className="h-10 w-10 object-cover rounded border border-white/10"
                                  />
                                ) : (
                                  <div className="h-10 w-10 bg-white/10 rounded flex items-center justify-center border border-white/10">
                                    <FileText className="h-5 w-5 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{attachment.name}</p>
                                  <p className="text-[10px] text-white/70">{(attachment.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <a
                                  href={getFileUrl(attachment.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white hover:text-white/80 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <>
                          <MIKEMessageContent content={m.content} />
                          {hasFallback && (
                            <div className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-fit select-none shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              MIKE switched to backup provider.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming Content */}
              {isStreaming && streamingContent && (
                <div className="flex items-start gap-4 max-w-3xl w-full">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0 shadow-sm">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="text-base text-foreground leading-relaxed overflow-x-auto flex-1 w-full">
                    <MIKEMessageContent content={streamingContent.replace('__SYSTEM_FALLBACK_PROVIDER__', '')} />
                    {streamingContent.includes('__SYSTEM_FALLBACK_PROVIDER__') && (
                      <div className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-fit select-none shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        MIKE switched to backup provider.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loader during user prompt waiting */}
              {isStreaming && !streamingContent && (
                <div className="flex items-start gap-4 max-w-3xl">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 text-primary flex-shrink-0 shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-muted-foreground animate-pulse shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Panel */}
        {activeSessionId && (
          <div className="p-4 border-t border-border bg-background/50">
            {selectedMode === 'CODE' && (
              <div className="flex justify-center mb-3">
                {/* Expert Switch selector without gradients */}
                <div className="relative flex p-0.5 bg-background border border-border rounded-lg w-[260px] select-none text-xs">
                  <div className="absolute top-0.5 bottom-0.5 left-0.5 right-0.5 w-[calc(50%-2px)] z-0">
                    <motion.div
                      className="h-full w-full rounded-md shadow-sm border border-border bg-secondary"
                      animate={{
                        x: !expertMode ? 0 : '100%',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExpertModeChange(false)}
                    className={`relative z-10 flex-1 py-1.5 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors focus:outline-none ${
                      !expertMode ? 'text-primary font-extrabold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Quick Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExpertModeChange(true)}
                    className={`relative z-10 flex-1 py-1.5 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors focus:outline-none ${
                      expertMode ? 'text-primary font-extrabold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Expert Review
                  </button>
                </div>
              </div>
            )}
            {attachedFile && (
              <div className="max-w-4xl mx-auto mb-2.5 p-2 bg-secondary border border-border rounded-lg flex items-center gap-3 relative animate-in fade-in slide-in-from-bottom-2 select-none shadow-sm">
                {attachedFile.mimeType.startsWith('image/') ? (
                  <img
                    src={attachedFile.url}
                    alt={attachedFile.name}
                    className="h-12 w-12 object-cover rounded border border-border"
                  />
                ) : (
                  <div className="h-12 w-12 bg-background border border-border rounded flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{attachedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background/80 transition-colors mr-1"
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.doc,.pptx,.ppt,image/*"
              />
              <Button
                type="button"
                disabled={isStreaming || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="bg-secondary hover:bg-secondary/95 text-secondary-foreground flex-shrink-0 h-10 w-10 p-0 rounded-lg flex items-center justify-center border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-2"
                aria-label="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </Button>
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask a question, paste code/files, or drag-and-drop..."
                disabled={isStreaming}
                aria-label="Tutor query input"
                rows={1}
                className="flex-1 bg-background border border-input text-foreground focus:border-primary text-base py-3 px-4 rounded-lg focus:ring-1 focus:ring-primary/50 resize-none max-h-[200px] overflow-y-auto custom-scrollbar focus:outline-none transition-all placeholder:text-muted-foreground shadow-sm"
              />
              <Button
                type="submit"
                disabled={(!inputMessage.trim() && !attachedFile) || isStreaming}
                aria-label="Send message"
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex-shrink-0 h-10 w-10 p-0 rounded-lg flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
