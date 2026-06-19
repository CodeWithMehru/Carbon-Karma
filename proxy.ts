/**
 * Next.js proxy (the Next.js 16 rename of middleware) for auth protection and
 * rate limiting. Runs on every matched request — rate-limits the AI routes,
 * refreshes the Supabase auth session, and guards the authenticated routes.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/** Routes that require authentication */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/upload',
  '/actions',
  '/coach',
  '/feed',
  '/map',
  '/onboarding',
];

/** Routes that should redirect to dashboard if already authenticated */
const AUTH_ROUTES = ['/login', '/signup'];

/** Rate limit: max requests per IP per window */
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * In-memory rate-limit store. Suitable for a single instance / demo; a
 * horizontally-scaled deployment should back this with a shared store (e.g.
 * Redis) so limits hold across instances.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/** Timestamp of the last sweep, so cleanup runs at most once per window. */
let lastCleanupAt = 0;

/** Evict expired entries so the store cannot grow unbounded over time. */
function cleanupRateLimitStore(now: number): void {
  // Throttle the sweep to once per window — otherwise we'd pay an O(n) scan on
  // every AI request just to reclaim a handful of stale buckets.
  if (now - lastCleanupAt < RATE_LIMIT_WINDOW_MS) return;
  lastCleanupAt = now;
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting for AI routes ──────────────────────────────────────────
  if (pathname.startsWith('/api/ai/')) {
    // `x-forwarded-for` is only trustworthy behind a trusted proxy (Cloud Run /
    // the platform load balancer sets it); we take the left-most (client) hop.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const now = Date.now();
    cleanupRateLimitStore(now);
    const entry = rateLimitStore.get(ip);

    // Fixed-window counter per IP. If a window is still open, enforce the cap
    // (reply 429 with Retry-After once it's reached) and otherwise count the
    // request; if there's no entry or the window has expired, open a fresh one.
    if (entry && now < entry.resetAt) {
      if (entry.count >= RATE_LIMIT_MAX) {
        // Tell the client exactly how many seconds until the window resets.
        const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        // Record the throttle event for abuse monitoring (no PII beyond the IP,
        // and the logger is silenced under test).
        logger.warn(`Rate limit hit for ${pathname}`, { ip, retryAfter });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
      entry.count++;
    } else {
      // First request from this IP, or the previous window has elapsed.
      rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }
  }

  // ── Supabase auth session refresh ────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Resolve the session defensively — a Supabase/network failure must not 500
  // the whole site; treat it as "not authenticated" and let route guards apply.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  // ── Route protection ─────────────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    // Redirect to login without echoing the requested path as a query param.
    // The login flow always returns the user to the dashboard, so there is no
    // post-auth redirect to honor — and therefore no open-redirect surface.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
