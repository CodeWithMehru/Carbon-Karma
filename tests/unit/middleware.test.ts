/**
 * Unit tests for middleware logic — rate limiting, route protection, and auth redirects.
 * We test the core logic in isolation without requiring a full Next.js server.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Reproduce middleware constants for testing ─────────────────────────────
const PROTECTED_ROUTES = [
  '/dashboard',
  '/upload',
  '/actions',
  '/coach',
  '/feed',
  '/map',
  '/onboarding',
];
const AUTH_ROUTES = ['/login', '/signup'];
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Minimal in-memory rate limit store (mirrors middleware.ts) */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/** Check rate limit for a given IP. Returns true if blocked. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      return true; // blocked
    }
    entry.count++;
    return false;
  }

  rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

/** Check if a path is protected (requires auth). */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/** Check if a path is an auth route (redirect if already logged in). */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Middleware — Route Protection', () => {
  it('marks /dashboard as protected', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true);
  });

  it('marks /dashboard/settings as protected (prefix match)', () => {
    expect(isProtectedRoute('/dashboard/settings')).toBe(true);
  });

  it('marks /upload as protected', () => {
    expect(isProtectedRoute('/upload')).toBe(true);
  });

  it('marks /actions as protected', () => {
    expect(isProtectedRoute('/actions')).toBe(true);
  });

  it('marks /onboarding as protected', () => {
    expect(isProtectedRoute('/onboarding')).toBe(true);
  });

  it('marks /feed as protected', () => {
    expect(isProtectedRoute('/feed')).toBe(true);
  });

  it('marks /map as protected', () => {
    expect(isProtectedRoute('/map')).toBe(true);
  });

  it('does NOT mark / (landing page) as protected', () => {
    expect(isProtectedRoute('/')).toBe(false);
  });

  it('does NOT mark /login as protected', () => {
    expect(isProtectedRoute('/login')).toBe(false);
  });

  it('does NOT mark /signup as protected', () => {
    expect(isProtectedRoute('/signup')).toBe(false);
  });

  it('does NOT mark /api/ai/parse-receipt as protected', () => {
    expect(isProtectedRoute('/api/ai/parse-receipt')).toBe(false);
  });
});

describe('Middleware — Auth Route Detection', () => {
  it('detects /login as auth route', () => {
    expect(isAuthRoute('/login')).toBe(true);
  });

  it('detects /signup as auth route', () => {
    expect(isAuthRoute('/signup')).toBe(true);
  });

  it('does NOT flag /dashboard as auth route', () => {
    expect(isAuthRoute('/dashboard')).toBe(false);
  });

  it('does NOT flag / as auth route', () => {
    expect(isAuthRoute('/')).toBe(false);
  });
});

describe('Middleware — Rate Limiting', () => {
  beforeEach(() => {
    rateLimitStore.clear();
  });

  it('allows the first request from a new IP', () => {
    expect(isRateLimited('192.168.1.1')).toBe(false);
  });

  it('allows up to RATE_LIMIT_MAX requests from the same IP', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
  });

  it('blocks the 31st request from the same IP within the window', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      isRateLimited('ip-a');
    }
    // ip-a is now blocked, but ip-b should still be allowed
    expect(isRateLimited('ip-a')).toBe(true);
    expect(isRateLimited('ip-b')).toBe(false);
  });

  it('resets rate limit after the window expires', () => {
    const ip = '10.0.0.3';
    // Fill up the limit
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);

    // Manually expire the window
    const entry = rateLimitStore.get(ip)!;
    entry.resetAt = Date.now() - 1;
    expect(isRateLimited(ip)).toBe(false);
  });

  it('creates a new entry for unknown IP', () => {
    isRateLimited('brand-new-ip');
    const entry = rateLimitStore.get('brand-new-ip');
    expect(entry).toBeDefined();
    expect(entry!.count).toBe(1);
  });

  it('window duration is 60 seconds', () => {
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('max limit is 30 requests', () => {
    expect(RATE_LIMIT_MAX).toBe(30);
  });
});
