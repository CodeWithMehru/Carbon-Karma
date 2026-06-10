import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Leaf, Camera, Trophy, ArrowUpRight, ArrowDownRight, Activity, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/dashboard/trend-chart';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await (supabase as any).auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile
  let { data: profile } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    // Auto-create a stub profile to prevent redirect loops (e.g. if db trigger fails/is delayed)
    const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const { data: newProfile, error: createError } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: name,
        full_name: name,
        baseline_completed: false,
        karma_points: 0,
        karma_level: 1,
        total_kg_co2_saved: 0,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (createError) {
      console.error('Failed to auto-create profile:', createError.message);
      redirect('/onboarding');
    } else {
      profile = newProfile;
    }
  }

  // Redirect to onboarding if they haven't completed the quiz
  if (profile && !profile.baseline_completed) {
    redirect('/onboarding');
  }

  const karmaPoints = profile.karma_points || 0;
  const level = profile.karma_level || 1;
  const kgSaved = profile.total_kg_co2_saved || 0;
  const baseline = profile.baseline_monthly_kg_co2 || 0;

  // 1. Fetch sum of emissions for this month to compute current footprint
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: logs } = await (supabase as any)
    .from('carbon_logs')
    .select('kg_co2, is_saving, source')
    .eq('user_id', user.id)
    .gte('logged_at', startOfMonth.toISOString());

  // Pro-rate the baseline for the current day of the month so it looks realistic
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const proRatedBaseline = Math.round(baseline * (dayOfMonth / daysInMonth) * 10) / 10;

  const trackedEmissions = logs
    ? logs
        .filter((l: any) => l.source !== 'baseline_quiz' && !l.is_saving)
        .reduce((sum: number, l: any) => sum + Number(l.kg_co2), 0)
    : 0;

  const trackedSavings = logs
    ? logs
        .filter((l: any) => l.is_saving)
        .reduce((sum: number, l: any) => sum + Number(l.kg_co2), 0)
    : 0;

  const currentFootprint = Math.max(0, Math.round((proRatedBaseline + trackedEmissions - trackedSavings) * 10) / 10);

  // 2. Fetch recent community ripples from DB
  const { data: dbRipples } = await (supabase as any)
    .from('ripple_events')
    .select(`
      id,
      action_description,
      kg_co2_saved,
      profiles (
        display_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(4);

  // Fallback high-quality mock data for ripples
  const mockRipples = [
    { name: 'A community member', action: 'switched to PNG cooking gas', points: '+30 Karma', time: '1 hr ago' },
    { name: 'A commuter', action: 'commuted via Metro train', points: '+20 Karma', time: '2 hrs ago' },
    { name: 'A green citizen', action: 'started home composting', points: '+15 Karma', time: '4 hrs ago' },
    { name: 'A conscious shopper', action: 'refused single-use plastics', points: '+10 Karma', time: '8 hrs ago' }
  ];

  const parsedRipples = (dbRipples || []).map((r: any) => ({
    name: r.profiles?.display_name || 'Anonymous',
    action: r.action_description,
    points: `+${Math.round(r.kg_co2_saved * 10)} Karma`,
    time: 'Just now'
  }));

  const combinedRipples = [...parsedRipples, ...mockRipples].slice(0, 4);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-emerald-950">
            Welcome back, {profile.display_name?.split(' ')[0] || 'Changemaker'}
          </h1>
          <p className="text-[#4a6a4a] mt-1">
            Here's your impact overview for this month.
          </p>
        </div>
        <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm" size="lg">
          <Link href="/upload">
            <Camera className="h-5 w-5" />
            Scan Receipt with AI
          </Link>
        </Button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="h-24 w-24 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-emerald-800">Karma Score</CardDescription>
            <CardTitle className="text-4xl text-emerald-950 flex items-baseline gap-2">
              {karmaPoints} <span className="text-sm font-normal text-[#4a6a4a]">pts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
              <ArrowUpRight className="h-4 w-4" />
              <span>Level {level} Achieved</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Leaf className="h-24 w-24 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-emerald-800">Carbon Saved</CardDescription>
            <CardTitle className="text-4xl text-emerald-950 flex items-baseline gap-2">
              {kgSaved.toFixed(1)} <span className="text-sm font-normal text-[#4a6a4a]">kg CO₂</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowDownRight className="h-4 w-4" />
              <span>vs Baseline ({baseline} kg/mo)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-blue-100 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="h-24 w-24 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-blue-800">Current Footprint</CardDescription>
            <CardTitle className="text-4xl text-blue-950 flex items-baseline gap-2">
              {currentFootprint} <span className="text-sm font-normal text-[#4a6a4a]">kg CO₂</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              <span>This month's track</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Your Impact Trend</CardTitle>
              <CardDescription>How your footprint compares to your starting baseline</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart baseline={baseline} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="glass shadow-sm border-border/50 h-full max-h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Karma Ripple Feed
              </CardTitle>
              <CardDescription>Recent impact from your community</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2 space-y-4">
              {combinedRipples.map((ripple, idx) => (
                <FeedItem 
                  key={idx}
                  name={ripple.name} 
                  action={ripple.action} 
                  points={ripple.points} 
                  time={ripple.time}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeedItem({ name, action, points, time }: { name: string, action: string, points: string, time: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100">
      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-emerald-950 truncate">{name}</p>
        <p className="text-xs text-[#4a6a4a] truncate">{action}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold text-amber-600">{points}</span>
          <span className="text-[10px] text-gray-400">• {time}</span>
        </div>
      </div>
    </div>
  );
}
