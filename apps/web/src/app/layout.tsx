import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { IntroWrapper } from '@/components/app/intro-wrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

import { CommandPalette } from '@/components/app/command-palette';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://ple.app'),
  title: {
    default: 'PLE — Personalized Learning Empowerment',
    template: '%s | PLE',
  },
  description:
    'AI-powered engineering learning platform. Generate personalized roadmaps, practice with adaptive quizzes, and get mentored by your own AI tutor.',
  keywords: [
    'engineering education',
    'AI learning',
    'personalized roadmap',
    'quiz platform',
    'AI tutor',
    'STEM learning',
    'engineering students',
  ],
  authors: [{ name: 'PLE Team' }],
  creator: 'PLE',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ple.app',
    siteName: 'PLE',
    title: 'PLE — Personalized Learning Empowerment',
    description:
      'AI-powered engineering learning platform with personalized roadmaps, adaptive quizzes, and AI mentorship.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PLE — Personalized Learning Empowerment',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PLE — Personalized Learning Empowerment',
    description: 'AI-powered engineering learning with personalized roadmaps and AI tutor.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'PLE',
              description: 'AI-powered engineering learning platform',
              url: 'https://ple.app',
              applicationCategory: 'EducationApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <IntroWrapper>{children}</IntroWrapper>
        </Providers>
        <CommandPalette />
        <Toaster />
      </body>
    </html>
  );
}
