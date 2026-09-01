'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Map,
  BookOpen,
  Brain,
  Target,
  Settings,
  Layers,
  Newspaper,
  Sun,
  Moon,
  Laptop,
  Search,
  X,
  FileText
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: any;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle command palette on shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for custom trigger event from Header search box
  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('trigger-command-palette', handleTrigger);
    return () => window.removeEventListener('trigger-command-palette', handleTrigger);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchQuery('');
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        router.push('/dashboard');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-roadmap',
      label: 'Go to Learning Roadmap',
      category: 'Navigation',
      icon: Map,
      action: () => {
        router.push('/roadmap');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-quiz',
      label: 'Go to Practice Quizzes',
      category: 'Navigation',
      icon: BookOpen,
      action: () => {
        router.push('/quiz');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-tutor',
      label: 'Go to MIKE Tutor Chat',
      category: 'Navigation',
      icon: Brain,
      action: () => {
        router.push('/tutor');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-goals',
      label: 'Go to Learning Goals',
      category: 'Navigation',
      icon: Target,
      action: () => {
        router.push('/goals');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-skills',
      label: 'Go to Skills Progress',
      category: 'Navigation',
      icon: Layers,
      action: () => {
        router.push('/skills');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-news',
      label: 'Go to Informative Hub News',
      category: 'Navigation',
      icon: Newspaper,
      action: () => {
        router.push('/news');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-resume',
      label: 'Go to MIKE Resume Center & Insights',
      category: 'Navigation',
      icon: FileText,
      action: () => {
        router.push('/settings?tab=resume');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Account Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        router.push('/settings');
        setIsOpen(false);
      },
    },
    // Theme preferences
    {
      id: 'theme-light',
      label: 'Switch to Light Theme ☀️',
      category: 'Appearance',
      icon: Sun,
      action: () => {
        setTheme('light');
        setIsOpen(false);
      },
    },
    {
      id: 'theme-dark',
      label: 'Switch to Dark Theme 🌙',
      category: 'Appearance',
      icon: Moon,
      action: () => {
        setTheme('dark');
        setIsOpen(false);
      },
    },
    {
      id: 'theme-system',
      label: 'Use System Default Theme 💻',
      category: 'Appearance',
      icon: Laptop,
      action: () => {
        setTheme('system');
        setIsOpen(false);
      },
    },
  ];

  // Filter commands
  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm select-none">
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col focus:outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-background/50">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search page..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-base focus:outline-none border-none outline-none font-medium"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase">
            esc
          </kbd>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus:outline-none"
            aria-label="Close command palette"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-[350px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-card">
          {filteredCommands.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 font-medium">
              No commands found. Try searching for "Tutor" or "Theme".
            </p>
          ) : (
            // Group by category
            Object.entries(
              filteredCommands.reduce((acc, c) => {
                acc[c.category] = acc[c.category] || [];
                acc[c.category].push(c);
                return acc;
              }, {} as Record<string, CommandItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card">
                  {category}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const globalIdx = filteredCommands.findIndex((fc) => fc.id === item.id);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center gap-3.5 rounded-lg px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/90 hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold opacity-80 uppercase font-mono bg-white/10 px-1.5 py-0.5 rounded">
                          Enter
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-background/30 text-[10px] text-muted-foreground font-semibold font-sans">
          <div className="flex items-center gap-3.5">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 border border-border rounded bg-background">↑</kbd>
              <kbd className="px-1 border border-border rounded bg-background">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 border border-border rounded bg-background">Enter</kbd>
              Select
            </span>
          </div>
          <span>PLE Command Center</span>
        </div>
      </div>
    </div>
  );
}
