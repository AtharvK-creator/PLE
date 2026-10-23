import type { Metadata } from 'next';
import { AppSidebar } from '@/components/app/sidebar';
import { AppHeader } from '@/components/app/header';
import { OnboardingGuard } from '@/components/app/onboarding-guard';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | PLE',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGuard>
      <div className="flex min-h-dvh bg-background">
        <div className="print:hidden flex-shrink-0">
          <AppSidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="print:hidden">
            <AppHeader />
          </div>
          <main className="flex-1 overflow-auto p-6 print:p-0">
            {children}
          </main>
        </div>
      </div>
    </OnboardingGuard>
  );
}
