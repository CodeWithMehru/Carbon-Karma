'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from '@/lib/validators/schemas';
import { redirect } from 'next/navigation';

export async function signUp(formData: SignUpInput) {
  const supabase = await createServerSupabaseClient();

  // Parse & validate input
  const validation = signUpSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid input data' };
  }

  const { email, password, fullName } = validation.data;

  // Sign up with Supabase Auth
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
    return { error: error.message };
  }

  return { success: true };
}

export async function signIn(formData: SignInInput) {
  const supabase = await createServerSupabaseClient();

  // Parse & validate input
  const validation = signInSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid input data' };
  }

  const { email, password } = validation.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function signInWithGoogle() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: 'Failed to initialize Google Auth' };
}
