/**
 * Supabase client for browser-side (Client Components).
 * Uses @supabase/ssr for cookie-based auth.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for use in Client Components.
 * Automatically handles auth token refresh via cookies.
 */
export function createClient() {
  // These are public (`NEXT_PUBLIC_*`) values, but validate them so a missing
  // build-time configuration fails with a clear message instead of `undefined`.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
