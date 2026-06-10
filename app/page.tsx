import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingUI from './landing-ui';

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect authenticated users to the dashboard
  if (user) {
    redirect('/dashboard');
  }

  return <LandingUI />;
}
