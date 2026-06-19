'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getKarmaLevel } from '@/lib/carbon/calculator';
import { updateStreak } from '@/lib/streak/streak';
import { logger } from '@/lib/logger';

/** Result of attempting to log an eco-action. */
export type LogEcoActionResult =
  | { success: true; points: number; title: string }
  | { success: false; error: string };

/**
 * Log an eco-action (a carbon saving) for the current user: award karma,
 * advance their daily streak, and emit an anonymized community ripple event.
 *
 * Karma totals are owned by the application layer (no DB trigger), so the
 * profile is updated explicitly here.
 */
export async function logEcoAction(actionId: string): Promise<LogEcoActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to log actions.' };
  }

  // 1. Fetch action details
  const { data: action, error: actionError } = await supabase
    .from('actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (actionError || !action) {
    return { success: false, error: 'Eco-action not found.' };
  }

  // 1b. Find the user's most recent activity to compute their daily streak.
  const { data: lastLog } = await supabase
    .from('carbon_logs')
    .select('logged_at')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Insert into carbon_logs (as a saving action)
  const { data: carbonLog, error: logError } = await supabase
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
      source: 'action_library',
    })
    .select()
    .single();

  if (logError) {
    return { success: false, error: `Failed to log carbon savings: ${logError.message}` };
  }

  // 3. Record karma transaction (ledger entry)
  const { error: karmaError } = await supabase.from('karma_transactions').insert({
    user_id: user.id,
    points: action.karma_reward,
    action_type: 'earned',
    description: `Completed: ${action.title}`,
    action_id: action.id,
    carbon_log_id: carbonLog.id,
  });

  if (karmaError) {
    return { success: false, error: `Failed to reward Karma: ${karmaError.message}` };
  }

  // 4. Update Profile Stats (karma, carbon saved, streak) and log a Ripple Event
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('karma_points, total_kg_co2_saved, city, current_streak, longest_streak')
      .eq('id', user.id)
      .single();

    if (profile) {
      const newKarmaPoints = (profile.karma_points || 0) + action.karma_reward;
      const newKarmaLevel = getKarmaLevel(newKarmaPoints);
      const newTotalSaved = Number(profile.total_kg_co2_saved || 0) + Number(action.kg_co2_saved);
      const { currentStreak, longestStreak } = updateStreak({
        lastActiveDate: lastLog?.logged_at ?? null,
        currentStreak: profile.current_streak ?? 0,
        longestStreak: profile.longest_streak ?? 0,
        today: new Date(),
      });

      await supabase
        .from('profiles')
        .update({
          karma_points: newKarmaPoints,
          karma_level: newKarmaLevel,
          total_kg_co2_saved: newTotalSaved,
          current_streak: currentStreak,
          longest_streak: longestStreak,
        })
        .eq('id', user.id);

      // Log an anonymized ripple event for the community feed
      const emojiMap: Record<string, string> = {
        transport: '🚲',
        food: '🥗',
        electricity: '💡',
        waste: '♻️',
        water: '💧',
        shopping: '🛍️',
      };

      await supabase.from('ripple_events').insert({
        user_id: user.id,
        city: profile.city || 'India',
        category: action.category,
        kg_co2_saved: action.kg_co2_saved,
        action_description: `completed action: "${action.title}"`,
        emoji: emojiMap[action.category] || '🌱',
      });
    }
  } catch (err) {
    logger.error('Error updating profile or logging ripple event', err);
  }

  revalidatePath('/dashboard');
  revalidatePath('/actions');
  revalidatePath('/feed');
  return { success: true, points: action.karma_reward, title: action.title };
}
