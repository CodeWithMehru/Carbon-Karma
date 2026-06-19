import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user already has baseline quiz completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('baseline_completed')
        .eq('id', data.user.id)
        .single();

      // If user has already completed the baseline, go straight to dashboard
      const redirectTo = profile?.baseline_completed ? '/dashboard' : '/onboarding';

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  // Return the user to an error page or login page if there's a problem
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
