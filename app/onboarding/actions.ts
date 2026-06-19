'use server';

/**
 * Onboarding server action.
 *
 * Validates the baseline-quiz answers, computes the user's monthly carbon
 * baseline, persists their profile (with the 100-point onboarding bonus), logs
 * the baseline emission record and karma-ledger entry, then redirects to the
 * dashboard. Karma totals are owned by the application layer (no DB trigger).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { baselineQuizSchema, type BaselineQuizInput } from '@/lib/validators/schemas';
import { calculateBaseline } from '@/lib/carbon/calculator';
import { logger } from '@/lib/logger';
import { redirect } from 'next/navigation';

/**
 * Result of an onboarding attempt. On success the action performs a server-side
 * redirect (which throws to unwind), so callers only ever observe the failure
 * branch as a returned value. Mirrors `AuthActionResult` / `LogEcoActionResult`.
 */
export type CompleteOnboardingResult = { success: true } | { success: false; error: string };

/**
 * Complete the baseline quiz for the signed-in user and redirect to the dashboard.
 *
 * @param formData - Validated baseline quiz answers.
 * @param city - User's city (localizes community metrics; stored as null if blank).
 * @param state - User's state (stored as null if blank).
 * @returns A {@link CompleteOnboardingResult} on failure; redirects on success.
 */
export async function completeOnboarding(
  formData: BaselineQuizInput,
  city: string,
  state: string
): Promise<CompleteOnboardingResult> {
  const supabase = await createServerSupabaseClient();

  // Get current user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'You must be signed in to complete onboarding.' };
  }

  // Validate quiz inputs using Zod
  const validation = baselineQuizSchema.safeParse(formData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Invalid quiz answers.',
    };
  }

  const quizAnswers = validation.data;

  // Calculate baseline emissions using the calculator engine
  const calculation = calculateBaseline(quizAnswers);
  const baselineMonthlyKg = calculation.kgCO2;

  // 1. Ensure Profile exists and is updated (upsert pattern).
  // `karma_points`/`karma_level` are set explicitly here (the app is the single
  // source of truth for karma); `updated_at` is maintained by a DB trigger.
  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: name,
    baseline_completed: true,
    baseline_monthly_kg_co2: baselineMonthlyKg,
    baseline_data: quizAnswers,
    city: city || null,
    state: state || null,
    karma_points: 100, // Starting bonus points
    karma_level: 2, // Level 2 "Sapling"
    total_kg_co2_saved: 0,
  });

  if (profileError) {
    return { success: false, error: `Failed to save profile: ${profileError.message}` };
  }

  // 2. Log the initial baseline carbon record
  const { data: carbonLog, error: logError } = await supabase
    .from('carbon_logs')
    .insert({
      user_id: user.id,
      category: 'other',
      subcategory: 'baseline_quiz',
      kg_co2: baselineMonthlyKg,
      is_saving: false,
      description: `Initial Baseline Carbon Estimate (${calculation.description})`,
      quantity: 1,
      unit: 'month',
      source: 'baseline_quiz',
    })
    .select()
    .single();

  if (logError) {
    // Non-blocking but good to know
    logger.error('Failed to log baseline carbon', logError.message);
  }

  // 3. Record the initial Karma reward transaction (ledger entry)
  const { error: karmaError } = await supabase.from('karma_transactions').insert({
    user_id: user.id,
    points: 100,
    action_type: 'bonus',
    description: 'Completed Carbon Baseline Quiz & Setup Onboarding',
    carbon_log_id: carbonLog?.id || null,
  });

  if (karmaError) {
    logger.error('Failed to log karma transaction', karmaError.message);
  }

  redirect('/dashboard');
}
