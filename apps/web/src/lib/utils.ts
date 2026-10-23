import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

const deterministicColors = [
  { bg: 'bg-blue-600 dark:bg-blue-500', text: 'text-white' },
  { bg: 'bg-emerald-600 dark:bg-emerald-500', text: 'text-white' },
  { bg: 'bg-indigo-600 dark:bg-indigo-500', text: 'text-white' },
  { bg: 'bg-violet-600 dark:bg-violet-500', text: 'text-white' },
  { bg: 'bg-amber-600 dark:bg-amber-500', text: 'text-white' },
  { bg: 'bg-rose-600 dark:bg-rose-500', text: 'text-white' },
  { bg: 'bg-cyan-600 dark:bg-cyan-500', text: 'text-white' },
  { bg: 'bg-teal-600 dark:bg-teal-500', text: 'text-white' },
];

export function getDeterministicColor(userId: string = ''): { bg: string; text: string } {
  if (!userId) return { bg: 'bg-primary', text: 'text-primary-foreground' };
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % deterministicColors.length;
  return deterministicColors[index];
}
