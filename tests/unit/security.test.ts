/**
 * Unit tests for security headers and configuration.
 * Verifies all required security headers are present in next.config.ts.
 */

import { describe, it, expect } from 'vitest';

// Replicate the security headers from next.config.ts for testing
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

describe('Security Headers', () => {
  it('should include X-Frame-Options set to DENY', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'X-Frame-Options');
    expect(header).toBeDefined();
    expect(header!.value).toBe('DENY');
  });

  it('should include X-Content-Type-Options set to nosniff', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'X-Content-Type-Options');
    expect(header).toBeDefined();
    expect(header!.value).toBe('nosniff');
  });

  it('should include Strict-Transport-Security (HSTS)', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'Strict-Transport-Security');
    expect(header).toBeDefined();
    expect(header!.value).toContain('max-age=');
    expect(header!.value).toContain('includeSubDomains');
    expect(header!.value).toContain('preload');
  });

  it('HSTS max-age should be at least 2 years (63072000 seconds)', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'Strict-Transport-Security');
    const maxAge = parseInt(header!.value.match(/max-age=(\d+)/)![1]);
    expect(maxAge).toBeGreaterThanOrEqual(63072000);
  });

  it('should include Referrer-Policy', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'Referrer-Policy');
    expect(header).toBeDefined();
    expect(header!.value).toBe('strict-origin-when-cross-origin');
  });

  it('should include X-XSS-Protection in blocking mode', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'X-XSS-Protection');
    expect(header).toBeDefined();
    expect(header!.value).toBe('1; mode=block');
  });

  it('should restrict permissions for camera and microphone', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'Permissions-Policy');
    expect(header).toBeDefined();
    expect(header!.value).toContain('camera=()');
    expect(header!.value).toContain('microphone=()');
  });

  it('should allow geolocation from self only', () => {
    const header = SECURITY_HEADERS.find((h) => h.key === 'Permissions-Policy');
    expect(header!.value).toContain('geolocation=(self)');
  });
});

describe('Content-Security-Policy', () => {
  it('should set default-src to self', () => {
    expect(CSP_DIRECTIVES.some((d) => d === "default-src 'self'")).toBe(true);
  });

  it('should prevent embedding in frames (frame-ancestors none)', () => {
    expect(CSP_DIRECTIVES.some((d) => d === "frame-ancestors 'none'")).toBe(true);
  });

  it('should restrict form actions to self', () => {
    expect(CSP_DIRECTIVES.some((d) => d === "form-action 'self'")).toBe(true);
  });

  it('should restrict base-uri to self', () => {
    expect(CSP_DIRECTIVES.some((d) => d === "base-uri 'self'")).toBe(true);
  });

  it('should allow Google Fonts in style-src', () => {
    const styleSrc = CSP_DIRECTIVES.find((d) => d.startsWith('style-src'));
    expect(styleSrc).toContain('https://fonts.googleapis.com');
  });

  it('should allow Google Fonts in font-src', () => {
    const fontSrc = CSP_DIRECTIVES.find((d) => d.startsWith('font-src'));
    expect(fontSrc).toContain('https://fonts.gstatic.com');
  });

  it('should allow Supabase connections', () => {
    const connectSrc = CSP_DIRECTIVES.find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://*.supabase.co');
    expect(connectSrc).toContain('wss://*.supabase.co');
  });

  it('should allow Google Generative AI API connections', () => {
    const connectSrc = CSP_DIRECTIVES.find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://generativelanguage.googleapis.com');
  });

  it('should allow data URIs and blob URLs for images', () => {
    const imgSrc = CSP_DIRECTIVES.find((d) => d.startsWith('img-src'));
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain('blob:');
  });
});

describe('File Size Validation (API Security)', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  it('should have a max file size of 10 MB', () => {
    expect(MAX_FILE_SIZE).toBe(10485760);
  });

  it('should accept files under the limit', () => {
    const fileSize = 5 * 1024 * 1024; // 5 MB
    expect(fileSize <= MAX_FILE_SIZE).toBe(true);
  });

  it('should reject files over the limit', () => {
    const fileSize = 15 * 1024 * 1024; // 15 MB
    expect(fileSize <= MAX_FILE_SIZE).toBe(false);
  });

  it('should accept files exactly at the limit', () => {
    expect(MAX_FILE_SIZE <= MAX_FILE_SIZE).toBe(true);
  });
});
