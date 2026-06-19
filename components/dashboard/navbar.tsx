'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, LayoutDashboard, Target, Users, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/auth/actions';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Actions', href: '/actions', icon: Target },
  { label: 'Ripple Feed', href: '/feed', icon: Users },
  { label: 'Impact Map', href: '/map', icon: Map },
];

export function DashboardNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-emerald-800 font-bold font-heading text-lg"
          >
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span className="hidden sm:inline-block">Carbon Karma</span>
          </Link>

          <nav aria-label="Dashboard Navigation" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-950',
                    isActive ? 'text-emerald-900' : 'text-[#4a6a4a]'
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4', isActive ? 'text-emerald-600' : 'text-emerald-600/50')}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-[#4a6a4a] hover:text-red-600"
            >
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex overflow-x-auto py-2 px-4 gap-4 border-t border-border/50 bg-white/50 backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[64px] text-xs font-medium transition-colors',
                isActive ? 'text-emerald-900' : 'text-[#4a6a4a]'
              )}
            >
              <Icon
                className={cn('h-5 w-5', isActive ? 'text-emerald-600' : 'text-emerald-600/50')}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
