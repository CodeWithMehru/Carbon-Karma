'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ParseReceiptResult } from '@/lib/ai/ai';
import { calculateKarmaPoints, getKarmaLevel } from '@/lib/carbon/calculator';

export async function confirmAndLogReceipt(receiptData: ParseReceiptResult) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await (supabase as any).auth.getUser();

  if (!user) {
    return { error: 'You must be logged in.' };
  }

  try {
    let totalEstimatedKgCO2 = 0;
    let sustainableItemCount = 0;
    let highCarbonItemCount = 0;

    // 1. Prepare items for insertion into carbon_logs
    const logsToInsert = receiptData.items.map(item => {
      totalEstimatedKgCO2 += item.estimated_kg_co2;
      
      if (item.sustainability_factor === 'sustainable') sustainableItemCount++;
      if (item.sustainability_factor === 'high_carbon') highCarbonItemCount++;

      return {
        user_id: user.id,
        category: item.category,
        subcategory: item.name, // specifically using the cleaned name
        kg_co2: item.estimated_kg_co2,
        is_saving: false, // A receipt represents emissions
        description: `Purchased at ${receiptData.store_name}. Unit: ${item.quantity} ${item.unit} | ₹${item.price_inr}`,
        quantity: item.quantity,
        unit: item.unit,
        source: 'ai_receipt',
      };
    });

    // We cast as any to bypass strict type checking for the complex insert array
    const { data: insertedLogs, error: logError } = await (supabase as any)
      .from('carbon_logs')
      .insert(logsToInsert)
      .select();

    if (logError) {
      throw new Error(`Failed to log carbon items: ${logError.message}`);
    }

    // 2. Compute Karma Points
    // - Flat 50 points for digitizing a receipt (promotes platform usage)
    // - +10 points for every sustainable choice
    // - +5 points for every neutral choice
    // - 0 points for high_carbon choices
    const neutralCount = receiptData.items.length - sustainableItemCount - highCarbonItemCount;
    const baseUploadKarma = 50;
    const itemKarma = (sustainableItemCount * 10) + (neutralCount * 5);
    const totalKarmaEarned = baseUploadKarma + itemKarma;

    // 3. Fetch current profile to increment
    const { data: profile, error: profileFetchError } = await (supabase as any)
      .from('profiles')
      .select('karma_points, total_kg_co2_saved')
      .eq('id', user.id)
      .single();

    if (profileFetchError) {
      throw new Error(`Failed to read profile: ${profileFetchError.message}`);
    }

    const newKarmaPoints = (profile.karma_points || 0) + totalKarmaEarned;
    const newKarmaLevel = getKarmaLevel(newKarmaPoints);

    // Update Profile
    const { error: profileUpdateError } = await (supabase as any)
      .from('profiles')
      .update({
        karma_points: newKarmaPoints,
        karma_level: newKarmaLevel,
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }

    // 4. Log the transaction
    const { error: transactionError } = await (supabase as any)
      .from('karma_transactions')
      .insert({
        user_id: user.id,
        points: totalKarmaEarned,
        action_type: 'earned',
        description: `Logged Receipt from ${receiptData.store_name} (${sustainableItemCount} eco-friendly items)`,
        carbon_log_id: insertedLogs?.[0]?.id || null, // Link to the first item for reference
      });

    if (transactionError) {
      console.error('Failed to insert karma transaction:', transactionError);
    }

    // 5. Update Carbon Saved & Create Ripple Event if sustainable choices were made
    if (sustainableItemCount > 0) {
      const carbonSavedEstimation = sustainableItemCount * 1.5;
      const newTotalSaved = (profile.total_kg_co2_saved || 0) + carbonSavedEstimation;
      
      await (supabase as any)
        .from('profiles')
        .update({ total_kg_co2_saved: newTotalSaved })
        .eq('id', user.id);

      const { data: userProfile } = await (supabase as any)
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();

      await (supabase as any)
        .from('ripple_events')
        .insert({
          user_id: user.id,
          city: userProfile?.city || 'India',
          category: receiptData.items[0]?.category || 'shopping',
          kg_co2_saved: carbonSavedEstimation,
          action_description: `chose ${sustainableItemCount} eco-friendly item${sustainableItemCount > 1 ? 's' : ''} at ${receiptData.store_name}`,
          emoji: '🛒'
        });
    }

    return { 
      success: true, 
      karmaEarned: totalKarmaEarned, 
      totalFootprint: totalEstimatedKgCO2 
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error confirming receipt:', error);
    return { success: false, error: message };
  }
}
