import type { Metadata } from 'next';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your learning progress and activity overview',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
