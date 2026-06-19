/**
 * Supabase client for server-side usage (Server Components, Route Handlers, Server Actions).
 * Uses @supabase/ssr with Next.js cookie handling.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for Server Components and Route Handlers.
 * Must be called within a request context where cookies are available.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  // Fail fast with a readable, non-secret message rather than building a client
  // from `undefined` if the deployment is missing its Supabase configuration.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookies are read-only.
          // This is expected during initial page loads.
        }
      },
    },
  });
}
