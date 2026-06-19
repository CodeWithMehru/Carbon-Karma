/**
 * Root route (`/`). Sends authenticated users straight to the dashboard and
 * renders the public landing page for everyone else.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingUI from './landing-ui';

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  // Resolve the session defensively so the public landing page still renders
  // even if Supabase is unreachable.
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  // Redirect authenticated users to the dashboard
  if (user) {
    redirect('/dashboard');
  }

  return <LandingUI />;
}
