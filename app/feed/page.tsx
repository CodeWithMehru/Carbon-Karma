/**
 * Karma Ripple Feed — server-renders the most recent anonymized community
 * eco-actions so users can see their collective impact (the social "Reduce" loop).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Users, Sprout, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { logger } from '@/lib/logger';

// Shape of a ripple event joined with its (anonymized) author profile.
interface RippleEventRow {
  id: string;
  city: string | null;
  category: string;
  kg_co2_saved: number;
  action_description: string;
  emoji: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
}

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch recent community actions from profiles + ripple_events
  const { data: dbEvents, error } = await supabase
    .from('ripple_events')
    .select(
      `
      id,
      city,
      category,
      kg_co2_saved,
      action_description,
      emoji,
      created_at,
      profiles (
        display_name
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(10)
    .returns<RippleEventRow[]>();

  if (error) {
    logger.error('Error fetching ripple events', error.message);
  }

  // Static rich seed events to populate the feed alongside database entries.
  const mockEvents = [
    {
      id: 'm1',
      display_name: 'A community member',
      city: 'Delhi',
      action_description: 'switched to PNG (Piped Natural Gas) for cooking',
      kg_co2_saved: 12.5,
      emoji: '🔥',
    },
    {
      id: 'm2',
      display_name: 'A commuter',
      city: 'Mumbai',
      action_description: 'commuted to work via Metro Train instead of car',
      kg_co2_saved: 7.2,
      emoji: '🚇',
    },
    {
      id: 'm3',
      display_name: 'A green citizen',
      city: 'Pune',
      action_description: 'set up a home composting unit for kitchen waste',
      kg_co2_saved: 3.4,
      emoji: '🍂',
    },
    {
      id: 'm4',
      display_name: 'A conscious shopper',
      city: 'Bengaluru',
      action_description: 'avoided single-use plastics during weekend shopping',
      kg_co2_saved: 1.8,
      emoji: '🛍️',
    },
    {
      id: 'm5',
      display_name: 'A changemaker',
      city: 'Kolkata',
      action_description: 'installed five LED bulbs to replace incandescent ones',
      kg_co2_saved: 5.6,
      emoji: '💡',
    },
  ];

  // Real DB events arrive newest-first from the query; show them ahead of the seed examples.
  const parsedDbEvents = (dbEvents || []).map((e) => ({
    id: e.id,
    display_name: e.profiles?.display_name || 'Anonymous Maker',
    city: e.city || 'India',
    action_description: e.action_description,
    kg_co2_saved: Number(e.kg_co2_saved),
    emoji: e.emoji || '🌱',
  }));

  const combinedEvents = [...parsedDbEvents, ...mockEvents];

  return (
    <div className="min-h-screen bg-[#fafdf7] flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-heading text-emerald-950">Karma Ripple Feed</h1>
            <p className="text-[#3d5a3d] mt-1">
              Real-time collective climate actions spreading positive environmental waves across
              India.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {combinedEvents.map((event) => (
            <Card
              key={event.id}
              className="glass border-emerald-100/50 shadow-sm bg-white/80 hover:shadow-md transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <span className="text-3xl select-none" role="img" aria-hidden="true">
                    {event.emoji}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-emerald-950 text-base">
                        {event.display_name}
                      </span>
                      <span className="text-xs text-emerald-600/70 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                        {event.city}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mt-1">{event.action_description}</p>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-100/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <Sprout className="h-4 w-4" />
                        <span>Saved {event.kg_co2_saved.toFixed(1)} kg CO₂</span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-400">
                        <button className="flex items-center gap-1 hover:text-rose-500 transition-colors text-xs">
                          <Heart className="h-4 w-4" />
                          <span>Support</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-emerald-700 transition-colors text-xs">
                          <MessageSquare className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
