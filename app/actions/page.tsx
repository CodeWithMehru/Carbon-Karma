import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ActionsList } from './actions-list';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { logger } from '@/lib/logger';

export default async function ActionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all active eco-actions
  const { data: actions, error } = await supabase
    .from('actions')
    .select('*')
    .eq('is_active', true)
    .order('karma_reward', { ascending: false });

  if (error) {
    logger.error('Error fetching actions', error.message);
  }

  return (
    <div className="min-h-screen bg-[#fafdf7] flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-emerald-950">Eco-Action Library</h1>
          <p className="text-[#4a6a4a] mt-1">
            Perform these daily habits to reduce your carbon footprint and accumulate Karma points.
          </p>
        </div>

        <ActionsList initialActions={actions || []} />
      </main>
    </div>
  );
}
