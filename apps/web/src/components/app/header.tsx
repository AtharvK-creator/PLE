'use client';

import { Bell, Sun, Moon, Laptop, Search, ChevronDown, User, Settings as SettingsIcon, FileText, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, getDeterministicColor, cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/roadmap': 'Learning Roadmap',
  '/quiz': 'Practice Quizzes',
  '/tutor': 'AI Tutor',
  '/goals': 'Learning Goals',
  '/skills': 'Skills',
  '/news': 'Informative Hub',
  '/settings': 'Settings',
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  const { data: userProfile } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/users/me');
      return res.data.data;
    },
  });

  const title =
    Object.entries(routeTitles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'PLE';

  const displayName = userProfile?.profile?.name || user?.email?.split('@')[0] || 'Student';
  const email = userProfile?.email || user?.email || '';
  const initials = getInitials(displayName);
  const userId = userProfile?.id || user?.id || '';
  const rawAvatarUrl = userProfile?.profile?.avatarUrl;

  useEffect(() => {
    setAvatarError(false);
  }, [rawAvatarUrl]);

  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001';
    if (path.includes('?v=')) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}${path}?v=${userProfile?.profile?.updatedAt ? new Date(userProfile.profile.updatedAt).getTime() : Date.now()}`;
  };

  const avatarUrl = getAvatarUrl(rawAvatarUrl);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuth();
      router.push('/');
    }
  };

  const triggerCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('trigger-command-palette'));
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10 select-none">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Search bar hint (Command Palette) */}
        <button
          onClick={triggerCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-input bg-background/40 hover:bg-secondary text-xs font-semibold text-muted-foreground transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search commands...</span>
          <kbd className="hidden sm:inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-bold text-muted-foreground uppercase">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher Toggle */}
        {mounted && (
          <div className="flex items-center border border-input bg-background/40 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md transition-colors focus:outline-none ${
                theme === 'light'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Light Mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md transition-colors focus:outline-none ${
                theme === 'dark'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dark Mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-md transition-colors focus:outline-none ${
                theme === 'system'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="System Preference"
            >
              <Laptop className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus:outline-none">
          <Bell className="h-4 w-4" />
        </button>

        {/* Click outside backdrop for dropdown */}
        {dropdownOpen && (
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setDropdownOpen(false)}
          />
        )}

        {/* Avatar Dropdown */}
        <div className="relative z-40">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full p-0.5 cursor-pointer"
          >
            <div 
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white select-none shadow-sm border border-border/80 uppercase overflow-hidden",
                (!rawAvatarUrl || avatarError) && getDeterministicColor(userId).bg,
                (!rawAvatarUrl || avatarError) && getDeterministicColor(userId).text
              )}
            >
              {rawAvatarUrl && !avatarError ? (
                <img 
                  src={avatarUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                  onError={() => {
                    setAvatarError(true);
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
              {/* User info header */}
              <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-bold truncate text-foreground">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{email}</p>
              </div>

              {/* Links */}
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>Profile</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => {
                  setDropdownOpen(false);
                  // Dispatches setting active tab to 'resume' in settings
                  const event = new CustomEvent('set-settings-tab', { detail: 'resume' });
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Resume Center</span>
              </Link>

              <div className="h-px bg-border my-1.5" />

              {/* Logout */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
