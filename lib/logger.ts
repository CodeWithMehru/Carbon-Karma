/**
 * Minimal structured logger.
 *
 * Centralises server-side logging so call sites stay consistent and so output
 * can be silenced during tests. In production this is where you would forward
 * to a sink (Cloud Logging, Sentry, etc.); for now it wraps `console`.
 */

type LogLevel = 'info' | 'warn' | 'error';

const isTest = process.env.NODE_ENV === 'test';

function emit(level: LogLevel, message: string, meta?: unknown): void {
  if (isTest) return; // keep test output clean
  const payload = meta === undefined ? '' : meta;
  console[level](`[carbon-karma] ${message}`, payload);
}

export const logger = {
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
