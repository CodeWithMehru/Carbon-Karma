'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getKarmaLevel } from '@/lib/carbon/calculator';

export async function logEcoAction(actionId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await (supabase as any).auth.getUser();

  if (authError || !user) {
    return { error: 'You must be signed in to log actions.' };
  }

  // 1. Fetch action details
  const { data: action, error: actionError } = await (supabase as any)
    .from('actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (actionError || !action) {
    return { error: 'Eco-action not found.' };
  }

  // 2. Insert into carbon_logs (as a saving action)
  const { data: carbonLog, error: logError } = await (supabase as any)
    .from('carbon_logs')
    .insert({
      user_id: user.id,
      category: action.category,
      subcategory: action.title,
      kg_co2: action.kg_co2_saved,
      is_saving: true, // It is a saving/positive action
      description: `Logged action: ${action.title}`,
      quantity: 1,
      unit: 'times',
      source: 'action_library'
    })
    .select()
    .single();

  if (logError) {
    return { error: `Failed to log carbon savings: ${logError.message}` };
  }

  // 3. Record karma transaction
  const { error: karmaError } = await (supabase as any)
    .from('karma_transactions')
    .insert({
      user_id: user.id,
      points: action.karma_reward,
      action_type: 'earned',
      description: `Completed: ${action.title}`,
      action_id: action.id,
      carbon_log_id: carbonLog.id
    });

  if (karmaError) {
    return { error: `Failed to reward Karma: ${karmaError.message}` };
  }

  // 4. Update Profile Stats and log a Ripple Event
  try {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('karma_points, total_kg_co2_saved, city')
      .eq('id', user.id)
      .single();

    if (profile) {
      const newKarmaPoints = (profile.karma_points || 0) + action.karma_reward;
      const newKarmaLevel = getKarmaLevel(newKarmaPoints);
      const newTotalSaved = Number(profile.total_kg_co2_saved || 0) + Number(action.kg_co2_saved);

      await (supabase as any)
        .from('profiles')
        .update({
          karma_points: newKarmaPoints,
          karma_level: newKarmaLevel,
          total_kg_co2_saved: newTotalSaved
        })
        .eq('id', user.id);

      // Log a ripple event
      const emojiMap: Record<string, string> = {
        transport: '🚲',
        food: '🥗',
        electricity: '💡',
        waste: '♻️',
        water: '💧',
        shopping: '🛍️'
      };

      await (supabase as any)
        .from('ripple_events')
        .insert({
          user_id: user.id,
          city: profile.city || 'India',
          category: action.category,
          kg_co2_saved: action.kg_co2_saved,
          action_description: `completed action: "${action.title}"`,
          emoji: emojiMap[action.category] || '🌱'
        });
    }
  } catch (err) {
    console.error('Error updating profile or logging ripple event:', err);
  }

  revalidatePath('/dashboard');
  revalidatePath('/actions');
  revalidatePath('/feed');
  return { success: true, points: action.karma_reward, title: action.title };
}
