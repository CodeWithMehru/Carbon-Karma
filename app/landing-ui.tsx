'use client';

/**
 * Landing page UI — the marketing hero and feature highlights shown to
 * unauthenticated visitors. Purely presentational (animated hero + three feature
 * cards) with a single CTA to sign up; entrance motion respects
 * `prefers-reduced-motion`.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Leaf, ArrowRight, Shield, Zap, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingUI() {
  const reduceMotion = useReducedMotion();
  return (
    <main
      aria-label="Carbon Karma Landing Page"
      className="flex-1 flex flex-col min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#fafdf7] overflow-hidden relative"
    >
      {/* Decorative Background Elements */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-3xl opacity-40 animate-pulse-glow"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-amber-100 rounded-full blur-3xl opacity-30 animate-pulse-glow"
        style={{ animationDuration: '6s', animationDelay: '2s' }}
      />
      <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-emerald-50 rounded-full blur-3xl opacity-50" />

      {/* Navbar (Simple for Landing) */}
      <nav
        aria-label="Main Navigation"
        className="w-full relative z-20 px-6 py-4 flex items-center justify-between glass border-b border-border/50"
      >
        <div className="flex items-center gap-2 text-emerald-800 font-bold font-heading text-xl">
          <Leaf className="h-6 w-6 text-emerald-600 animate-float" />
          <span>Carbon Karma</span>
        </div>
        <div className="flex items-center gap-4">{/* Top-right Log In button removed */}</div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center pt-16 pb-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-sm font-medium mb-4 backdrop-blur-sm">
            <SparklesIcon className="h-4 w-4" />
            <span>AI-Powered Carbon Tracking for India</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-emerald-950 font-heading leading-[1.1]">
            Turn Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500">
              Green Choices
            </span>{' '}
            <br className="hidden md:block" /> Into Real Impact.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#3d5a3d] max-w-2xl mx-auto leading-relaxed">
            Carbon Karma is a delightfully gamified platform where you track your lifestyle
            footprint, earn Karma points for sustainable actions, and see your positive ripple
            effect across the community.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-emerald-500/20 group"
            >
              <Link href="/signup">
                Get Started{' '}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <h2 className="sr-only">Key features</h2>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.7,
            delay: reduceMotion ? 0 : 0.3,
            ease: 'easeOut',
          }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full"
        >
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-amber-500" />}
            title="AI Receipt Parsing"
            description="Snap a picture of your grocery or fuel receipt. Our AI automatically extracts items and calculates carbon impact."
          />
          <FeatureCard
            icon={<TrendingDown className="h-6 w-6 text-emerald-600" />}
            title="Gamified Reductions"
            description="Earn Karma points for every kg of CO2 saved. Level up from 'Seed' to 'Banyan Tree' as you build sustainable habits."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6 text-blue-500" />}
            title="Community Ripples"
            description="Your actions inspire others. See how your 'Karma' creates a ripple effect across your city and state."
          />
        </motion.div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl glass border border-white/40 shadow-sm hover:shadow-md transition-shadow bg-white/40 backdrop-blur-md">
      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-emerald-950 mb-2 font-heading">{title}</h3>
      <p className="text-[#3d5a3d] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
