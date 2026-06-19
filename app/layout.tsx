/**
 * Root layout — loads fonts, sets global metadata/viewport, mounts the theme and
 * toast providers plus the floating accessibility menu, and exposes the
 * skip-to-content link and `#main-content` landmark.
 */

import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AccessibilityMenu } from '@/components/accessibility-menu';

// Configure Google Fonts for premium aesthetics
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Carbon Karma — Gamifying Carbon Footprint Reduction',
  description:
    'Understand, track, and reduce your carbon footprint with AI-powered insights, gamified karma points, and community ripple effects.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Carbon Karma',
    description:
      'Gamify your journey to net-zero with localized emission factors and AI receipts/photos parsing.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carbon Karma',
    description: 'Gamify your journey to net-zero with AI coaching and community ripple effects.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafdf7] text-[#1a2e1a] transition-colors duration-250">
        {/* Skip Link for WCAG 2.2 AAA Keyboard Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider />
          <div id="main-content" role="main" className="flex flex-col min-h-screen">
            {children}
          </div>
          <AccessibilityMenu />
        </ThemeProvider>
      </body>
    </html>
  );
}
