'use server';

/**
 * Authentication server actions (email/password, Google OAuth, sign-out).
 *
 * Every email/password entry point validates its payload with Zod before
 * touching Supabase Auth and returns the shared {@link AuthActionResult} union,
 * so client callers branch on `success` rather than probing for an `error`
 * field. OAuth and sign-out redirect on success and therefore never return the
 * success branch.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from '@/lib/validators/schemas';
import { redirect } from 'next/navigation';

/**
 * Discriminated-union result shared by the auth actions. Mirrors the pattern
 * used by `LogEcoActionResult` so callers can do `if (!result.success)`.
 */
export type AuthActionResult = { success: true } | { success: false; error: string };

/**
 * Register a new account with email + password.
 *
 * Validates the payload, creates the Supabase Auth user (storing the full name
 * in user metadata), and triggers a verification email that points back at the
 * auth callback. On success the caller should prompt the user to confirm their
 * email; no session exists until they do.
 */
export async function signUp(formData: SignUpInput): Promise<AuthActionResult> {
  const supabase = await createServerSupabaseClient();

  // Parse & validate input at the trust boundary.
  const validation = signUpSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Invalid input data' };
  }

  const { email, password, fullName } = validation.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign in an existing user with email + password.
 *
 * Validates the payload and authenticates against Supabase Auth. The calling
 * client redirects to the dashboard on success.
 */
export async function signIn(formData: SignInInput): Promise<AuthActionResult> {
  const supabase = await createServerSupabaseClient();

  // Parse & validate input at the trust boundary.
  const validation = signInSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Invalid input data' };
  }

  const { email, password } = validation.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign the current user out and redirect to the login page.
 *
 * Wired directly as a `<form action>`, so it performs a redirect (which throws
 * to unwind the request) and never returns a value.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Begin the Google OAuth flow.
 *
 * On success Supabase returns an authorization URL and we redirect the browser
 * to it, so this never returns the success branch; a configuration/SDK failure
 * is surfaced as an {@link AuthActionResult} error instead.
 */
export async function signInWithGoogle(): Promise<AuthActionResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: false, error: 'Failed to initialize Google Auth' };
}
