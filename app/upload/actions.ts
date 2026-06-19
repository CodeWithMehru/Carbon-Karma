'use server';

/**
 * Receipt server action.
 *
 * Persists a confirmed, AI-parsed receipt and applies all downstream effects in
 * one place: logging each item as an emission, awarding karma (via the pure
 * {@link scoreReceiptKarma} rules), advancing the daily streak, recording the
 * karma-ledger entry, and emitting an anonymized community ripple event. Karma
 * totals are owned by the application layer (no DB trigger), so the profile is
 * updated explicitly here.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ParseReceiptResult } from '@/lib/ai/ai';
import { getKarmaLevel } from '@/lib/carbon/calculator';
import { scoreReceiptKarma } from '@/lib/karma/scoring';
import { updateStreak } from '@/lib/streak/streak';
import { logger } from '@/lib/logger';
import type { CarbonCategory } from '@/lib/carbon/types';

/** Map an AI receipt item category onto a valid carbon_category enum value. */
function toCarbonCategory(category: string): CarbonCategory {
  switch (category) {
    case 'energy':
      return 'electricity';
    case 'food':
    case 'transport':
    case 'shopping':
      return category;
    default:
      return 'other';
  }
}

/**
 * Persist a confirmed AI-parsed receipt: log each item as an emission, award
 * karma for the upload and sustainable choices, advance the user's streak, and
 * surface a ripple event when greener picks were made.
 *
 * Return contract (the upload client branches on `result.error`):
 * - Success → `{ success: true, karmaEarned, totalFootprint }`.
 * - Processing failure (caught) → `{ success: false, error }`.
 * - Unauthenticated early-return → `{ error }` (kept as a bare error object for
 *   parity with the client's `result.error` check and the integration test).
 */
export async function confirmAndLogReceipt(receiptData: ParseReceiptResult) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Bare { error } early-return — the upload client checks `result.error`.
  if (!user) {
    return { error: 'You must be logged in.' };
  }

  try {
    const score = scoreReceiptKarma(receiptData.items);

    // 1. Capture the user's previous activity for streak calculation.
    const { data: lastLog } = await supabase
      .from('carbon_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Insert each receipt item as an emission entry.
    const logsToInsert = receiptData.items.map((item) => ({
      user_id: user.id,
      category: toCarbonCategory(item.category),
      subcategory: item.name,
      kg_co2: item.estimated_kg_co2,
      is_saving: false, // A receipt represents emissions
      description: `Purchased at ${receiptData.store_name}. Unit: ${item.quantity} ${item.unit} | ₹${item.price_inr}`,
      quantity: item.quantity,
      unit: item.unit,
      source: 'ai_receipt',
    }));

    const { data: insertedLogs, error: logError } = await supabase
      .from('carbon_logs')
      .insert(logsToInsert)
      .select();

    if (logError) {
      throw new Error(`Failed to log carbon items: ${logError.message}`);
    }

    // 3. Read the current profile to apply karma, savings, and streak updates.
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('karma_points, total_kg_co2_saved, city, current_streak, longest_streak')
      .eq('id', user.id)
      .single();

    if (profileFetchError) {
      throw new Error(`Failed to read profile: ${profileFetchError.message}`);
    }

    const newKarmaPoints = (profile.karma_points || 0) + score.totalKarma;
    const newKarmaLevel = getKarmaLevel(newKarmaPoints);
    const newTotalSaved = Number(profile.total_kg_co2_saved || 0) + score.estimatedKgSaved;
    const { currentStreak, longestStreak } = updateStreak({
      lastActiveDate: lastLog?.logged_at ?? null,
      currentStreak: profile.current_streak ?? 0,
      longestStreak: profile.longest_streak ?? 0,
      today: new Date(),
    });

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        karma_points: newKarmaPoints,
        karma_level: newKarmaLevel,
        total_kg_co2_saved: newTotalSaved,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    // 4. Record the karma ledger entry.
    const { error: transactionError } = await supabase.from('karma_transactions').insert({
      user_id: user.id,
      points: score.totalKarma,
      action_type: 'earned',
      description: `Logged Receipt from ${receiptData.store_name} (${score.sustainableCount} eco-friendly items)`,
      carbon_log_id: insertedLogs?.[0]?.id || null,
    });

    if (transactionError) {
      logger.error('Failed to insert karma transaction', transactionError);
    }

    // 5. Celebrate sustainable choices in the community ripple feed.
    if (score.sustainableCount > 0) {
      await supabase.from('ripple_events').insert({
        user_id: user.id,
        city: profile.city || 'India',
        category: toCarbonCategory(receiptData.items[0]?.category ?? 'shopping'),
        kg_co2_saved: score.estimatedKgSaved,
        action_description: `chose ${score.sustainableCount} eco-friendly item${
          score.sustainableCount > 1 ? 's' : ''
        } at ${receiptData.store_name}`,
        emoji: '🛒',
      });
    }

    return {
      success: true,
      karmaEarned: score.totalKarma,
      totalFootprint: score.totalEstimatedKgCO2,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Error confirming receipt', error);
    return { success: false, error: message };
  }
}
