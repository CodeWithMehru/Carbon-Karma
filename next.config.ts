import type { NextConfig } from 'next';

// 'unsafe-eval' is required only by the Next.js dev server (HMR / React Refresh).
// It is dropped from the production Content-Security-Policy below.
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // ── Added for Google Cloud Run Deployment ────────────────────────────────
  output: 'standalone',

  // Hide the dev-only overlay indicator (keeps the bottom-left corner free for
  // the accessibility menu and avoids it intercepting clicks during E2E).
  devIndicators: false,

  // ── Security Headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Isolate this site's browsing context group from cross-origin
            // openers (mitigates cross-origin tab/popup attacks).
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            // Block legacy Adobe cross-domain policy files entirely.
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ── Image Optimization ───────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ── Performance ──────────────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
};

export default nextConfig;
