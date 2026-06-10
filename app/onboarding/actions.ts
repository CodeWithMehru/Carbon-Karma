'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { baselineQuizSchema } from '@/lib/validators/schemas';
import { calculateBaseline } from '@/lib/carbon/calculator';
import { redirect } from 'next/navigation';

export async function completeOnboarding(formData: unknown, city: string, state: string) {
  const supabase = await createServerSupabaseClient();

  // Get current user session
  const { data: { user }, error: authError } = await (supabase as any).auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to complete onboarding.' };
  }

  // Validate quiz inputs using Zod
  const validation = baselineQuizSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid quiz answers.' };
  }

  const quizAnswers = validation.data;

  // Calculate baseline emissions using the calculator engine
  const calculation = calculateBaseline(quizAnswers);
  const baselineMonthlyKg = calculation.kgCO2;

  // 1. Ensure Profile exists and is updated (upsert pattern)
  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: name,
      full_name: name,
      baseline_completed: true,
      baseline_monthly_kg_co2: baselineMonthlyKg,
      baseline_data: quizAnswers as Record<string, unknown>,
      city: city || null,
      state: state || null,
      karma_points: 100, // Starting bonus points
      karma_level: 2,    // Level 2 "Sapling"
      total_kg_co2_saved: 0,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    return { error: `Failed to save profile: ${profileError.message}` };
  }

  // 2. Log the initial baseline carbon record
  const { data: carbonLog, error: logError } = await (supabase as any)
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
    console.error('Failed to log baseline carbon:', logError.message);
  }

  // 3. Record the initial Karma reward transaction
  const { error: karmaError } = await (supabase as any)
    .from('karma_transactions')
    .insert({
      user_id: user.id,
      points: 100,
      action_type: 'bonus',
      description: 'Completed Carbon Baseline Quiz & Setup Onboarding',
      carbon_log_id: carbonLog?.id || null,
    });

  if (karmaError) {
    console.error('Failed to log karma transaction:', karmaError.message);
  }

  redirect('/dashboard');
}
