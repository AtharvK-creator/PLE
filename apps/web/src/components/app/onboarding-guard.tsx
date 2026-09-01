'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { UserDto } from '@ple/types';
import { Loader2 } from 'lucide-react';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: userProfile, isLoading } = useQuery<UserDto>({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserDto }>('/users/me');
      return res.data.data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading && userProfile) {
      const profile = userProfile.profile;
      const isComplete = !!(profile && profile.branch !== '' && profile.careerGoal !== '');
      if (!isComplete && pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [userProfile, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
