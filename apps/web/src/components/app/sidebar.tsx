'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  BookOpen,
  Brain,
  Target,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn, getInitials, getDeterministicColor } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'MIKE Tutor', href: '/tutor', icon: Brain },
  { label: 'Informative Hub', href: '/news', icon: Newspaper },
  { label: 'Quiz', href: '/quiz', icon: BookOpen },
  { label: 'Roadmaps', href: '/roadmap', icon: Map },
  { label: 'Resume Center', href: '/settings', icon: Settings },
  { label: 'Thinking Lab', href: '/eyt', icon: Sparkles },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [avatarError, setAvatarError] = useState(false);



  const { data: userProfile } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any }>('/users/me');
      return res.data.data;
    },
  });

  const displayName = userProfile?.profile?.name || user?.email?.split('@')[0] || 'Student';
  const careerGoal = userProfile?.profile?.careerGoal || 'Curriculum Student';
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

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-card transition-all duration-300 select-none',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary flex-shrink-0">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">PLE</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer',
            collapsed && 'mx-auto',
          )}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Profile Header (Compact user info section) */}
      {user && (
        <div className="border-b border-border/60">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/10">
              <Link
                href="/settings"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold text-white select-none border border-border/80 uppercase overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity",
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
              </Link>
              <div className="min-w-0 flex-1">
                <Link href="/settings" className="text-xs font-bold text-foreground truncate hover:underline block cursor-pointer">
                  {displayName}
                </Link>
                <p className="text-[10px] text-muted-foreground truncate font-semibold mt-0.5">{careerGoal}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-3 bg-secondary/10">
              <Link 
                href="/settings"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-extrabold text-white select-none border border-border/80 uppercase overflow-hidden cursor-pointer hover:opacity-85 transition-opacity",
                  (!rawAvatarUrl || avatarError) && getDeterministicColor(userId).bg,
                  (!rawAvatarUrl || avatarError) && getDeterministicColor(userId).text
                )}
                title="Profile Settings"
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
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary/50',
                isActive
                  ? 'bg-secondary text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-1 focus:ring-destructive/50 cursor-pointer"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
