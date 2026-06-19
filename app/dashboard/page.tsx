import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Leaf,
  Camera,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  Zap,
  Sparkles,
  Flame,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChartLoader } from '@/components/dashboard/trend-chart-loader';
import { AiInsights } from '@/components/dashboard/ai-insights';
import { QuickActionsClient } from './quick-actions-client';
import { getInsightsForProfile } from '@/lib/insights/insights';
import { logger } from '@/lib/logger';
import Link from 'next/link';

/** Shape of a ripple event joined with its (anonymized) author profile. */
interface RippleRow {
  id: string;
  action_description: string;
  kg_co2_saved: number;
  profiles: { display_name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile (the typed client returns the full profile Row).
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    // Auto-create a stub profile to prevent redirect loops (e.g. if the DB
    // trigger that seeds profiles is delayed or failed).
    const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: name }, { onConflict: 'id' })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to auto-create profile', createError.message);
      redirect('/onboarding');
    }
    profile = newProfile;
  }

  // Type guard to ensure profile is non-null for subsequent property accesses.
  if (!profile) {
    redirect('/onboarding');
  }

  // Redirect to onboarding if they haven't completed the quiz.
  if (!profile.baseline_completed) {
    redirect('/onboarding');
  }

  const karmaPoints = profile.karma_points || 0;
  const level = profile.karma_level || 1;
  const kgSaved = profile.total_kg_co2_saved || 0;
  const baseline = profile.baseline_monthly_kg_co2 || 0;
  const currentStreak = profile.current_streak || 0;
  const longestStreak = profile.longest_streak || 0;

  // 1. Sum this month's emissions to compute the current footprint.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: logs } = await supabase
    .from('carbon_logs')
    .select('kg_co2, is_saving, source')
    .eq('user_id', user.id)
    .gte('logged_at', startOfMonth.toISOString());

  // Pro-rate the baseline for the current day of the month so it reads realistically.
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const proRatedBaseline = Math.round(baseline * (dayOfMonth / daysInMonth) * 10) / 10;

  const trackedEmissions = (logs ?? [])
    .filter((l) => l.source !== 'baseline_quiz' && !l.is_saving)
    .reduce((sum, l) => sum + Number(l.kg_co2), 0);

  const trackedSavings = (logs ?? [])
    .filter((l) => l.is_saving)
    .reduce((sum, l) => sum + Number(l.kg_co2), 0);

  const currentFootprint = Math.max(
    0,
    Math.round((proRatedBaseline + trackedEmissions - trackedSavings) * 10) / 10
  );

  // How far below the projected baseline the user is tracking — the headline
  // "reduce" metric.
  const reductionPct =
    proRatedBaseline > 0 ? Math.round((1 - currentFootprint / proRatedBaseline) * 100) : 0;
  const isBelowBaseline = reductionPct > 0;

  // 2. Fetch recent community ripples from the DB.
  const { data: dbRipples } = await supabase
    .from('ripple_events')
    .select(
      `
      id,
      action_description,
      kg_co2_saved,
      profiles (
        display_name
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(4)
    .returns<RippleRow[]>();

  // Fallback high-quality mock data for ripples.
  const mockRipples = [
    {
      id: 'mock-1',
      name: 'A community member',
      action: 'switched to PNG cooking gas',
      points: '+30 Karma',
      time: '1 hr ago',
    },
    {
      id: 'mock-2',
      name: 'A commuter',
      action: 'commuted via Metro train',
      points: '+20 Karma',
      time: '2 hrs ago',
    },
    {
      id: 'mock-3',
      name: 'A green citizen',
      action: 'started home composting',
      points: '+15 Karma',
      time: '4 hrs ago',
    },
    {
      id: 'mock-4',
      name: 'A conscious shopper',
      action: 'refused single-use plastics',
      points: '+10 Karma',
      time: '8 hrs ago',
    },
  ];

  const parsedRipples = (dbRipples ?? []).map((r) => ({
    id: `db-${r.id}`,
    name: r.profiles?.display_name || 'Anonymous',
    action: r.action_description,
    points: `+${Math.round(r.kg_co2_saved * 10)} Karma`,
    time: 'Just now',
  }));

  const combinedRipples = [...parsedRipples, ...mockRipples].slice(0, 4);

  // 3. Fetch actions for Quick Actions.
  const { data: dbActions } = await supabase
    .from('actions')
    .select('id, title, category, kg_co2_saved, karma_reward, icon_name')
    .eq('is_active', true)
    .limit(4);

  const fallbackActions = [
    {
      id: 'cycle-to-work',
      title: 'Cycle to Work',
      category: 'transport',
      kg_co2_saved: 4.2,
      karma_reward: 25,
      icon_name: 'bike',
    },
    {
      id: 'take-the-metro',
      title: 'Take the Metro',
      category: 'transport',
      kg_co2_saved: 3.5,
      karma_reward: 20,
      icon_name: 'train',
    },
    {
      id: 'vegetarian-meal',
      title: 'Vegetarian Meal',
      category: 'food',
      kg_co2_saved: 2.6,
      karma_reward: 15,
      icon_name: 'salad',
    },
    {
      id: 'led-switch',
      title: 'LED Switch',
      category: 'electricity',
      kg_co2_saved: 0.5,
      karma_reward: 5,
      icon_name: 'lightbulb',
    },
  ];

  const quickActions = dbActions && dbActions.length > 0 ? dbActions : fallbackActions;

  // 4. Compute personalized, data-driven insights (the AiInsights component
  //    progressively enhances these with Gemini on the client).
  const initialInsights = getInsightsForProfile(profile.baseline_data);

  return (
    <div
      className="container mx-auto px-4 py-8 max-w-7xl"
      role="region"
      aria-label="Carbon Karma User Dashboard"
    >
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-emerald-950">
            Welcome back, {profile.display_name?.split(' ')[0] || 'Changemaker'}
          </h1>
          <p className="text-[#3d5a3d] mt-1">Here&apos;s your impact overview for this month.</p>
        </div>
        <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm" size="lg">
          <Link href="/upload" aria-label="Scan a new receipt with Gemini AI">
            <Camera className="h-5 w-5" aria-hidden="true" />
            Scan Receipt with AI
          </Link>
        </Button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          className="glass border-emerald-100 shadow-sm relative overflow-hidden"
          role="region"
          aria-label="Karma Score Status"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
            <Trophy className="h-24 w-24 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-emerald-800">Karma Score</CardDescription>
            <CardTitle className="text-4xl text-emerald-950 flex items-baseline gap-2">
              {karmaPoints} <span className="text-sm font-normal text-[#3d5a3d]">pts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span>Level {level} Achieved</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass border-emerald-100 shadow-sm relative overflow-hidden"
          role="region"
          aria-label="Carbon Saved Status"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
            <Leaf className="h-24 w-24 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-emerald-800">Carbon Saved</CardDescription>
            <CardTitle className="text-4xl text-emerald-950 flex items-baseline gap-2">
              {kgSaved.toFixed(1)}{' '}
              <span className="text-sm font-normal text-[#3d5a3d]">kg CO₂</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              <span>vs Baseline ({baseline} kg/mo)</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass border-blue-100 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50"
          role="region"
          aria-label="Current Footprint Status"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
            <Activity className="h-24 w-24 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-blue-800">
              Current Footprint
            </CardDescription>
            <CardTitle className="text-4xl text-blue-950 flex items-baseline gap-2">
              {currentFootprint} <span className="text-sm font-normal text-[#3d5a3d]">kg CO₂</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBelowBaseline ? (
              <div className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                <TrendingDown className="h-4 w-4" aria-hidden="true" />
                <span>{reductionPct}% below baseline pace</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                <span>This month&apos;s tracked total</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className="glass border-orange-100 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-orange-50/40"
          role="region"
          aria-label="Daily Streak Status"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
            <Flame className="h-24 w-24 text-orange-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-medium text-orange-800">Day Streak</CardDescription>
            <CardTitle className="text-4xl text-orange-950 flex items-baseline gap-2">
              {currentStreak}{' '}
              <span className="text-sm font-normal text-[#3d5a3d]">
                {currentStreak === 1 ? 'day' : 'days'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
              <Flame className="h-4 w-4" aria-hidden="true" />
              <span>
                Best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <section className="mb-8" aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="text-xl font-bold font-heading text-emerald-950 mb-4 flex items-center gap-2"
        >
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500" aria-hidden="true" />
          Quick Actions: Log an Eco-Choice
        </h2>
        <QuickActionsClient actions={quickActions} />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card
            className="glass shadow-sm border-border/50"
            role="region"
            aria-label="Footprint reduction trend chart"
          >
            <CardHeader>
              <CardTitle className="text-xl">Your Impact Trend</CardTitle>
              <CardDescription>
                How your footprint compares to your starting baseline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChartLoader baseline={baseline} />
            </CardContent>
          </Card>

          {/* Personalized AI Insights */}
          <Card
            className="glass shadow-sm border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20"
            role="region"
            aria-label="Personalized AI carbon insights"
          >
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                Personalized AI Insights
              </CardTitle>
              <CardDescription>
                Targeted ways to reduce your biggest emission sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiInsights initialInsights={initialInsights} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card
            className="glass shadow-sm border-border/50 h-full max-h-[570px] flex flex-col"
            role="region"
            aria-label="Community activity feed"
          >
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                Karma Ripple Feed
              </CardTitle>
              <CardDescription>Recent impact from your community</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2 space-y-4">
              {combinedRipples.map((ripple) => (
                <FeedItem
                  key={ripple.id}
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

function FeedItem({
  name,
  action,
  points,
  time,
}: {
  name: string;
  action: string;
  points: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100">
      <div
        className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs flex-shrink-0"
        aria-hidden="true"
      >
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-emerald-950 truncate">{name}</p>
        <p className="text-xs text-[#3d5a3d] truncate">{action}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold text-amber-700">{points}</span>
          <span className="text-xs text-gray-600">• {time}</span>
        </div>
      </div>
    </div>
  );
}
