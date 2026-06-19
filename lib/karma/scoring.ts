/**
 * Karma scoring rules for AI-parsed receipts.
 *
 * Pure functions extracted from the receipt server action so the reward logic
 * is independently unit-testable and reusable. Karma is awarded for the act of
 * digitising a receipt plus the sustainability of the individual choices.
 */

import type { ParsedReceiptItem } from '@/lib/ai/ai';

/** Flat reward for digitising any receipt (promotes platform usage). */
export const BASE_UPLOAD_KARMA = 50;
/** Bonus per item flagged as a sustainable choice. */
export const SUSTAINABLE_ITEM_KARMA = 10;
/** Bonus per item with a neutral footprint. */
export const NEUTRAL_ITEM_KARMA = 5;
/** Estimated kg CO₂ avoided per sustainable choice (used for the Carbon Saved metric). */
export const KG_SAVED_PER_SUSTAINABLE_ITEM = 1.5;

export interface ReceiptKarmaBreakdown {
  sustainableCount: number;
  neutralCount: number;
  highCarbonCount: number;
  baseUploadKarma: number;
  itemKarma: number;
  totalKarma: number;
  estimatedKgSaved: number;
  totalEstimatedKgCO2: number;
}

type SustainabilityFactor = ParsedReceiptItem['sustainability_factor'];

/**
 * Score the karma and estimated carbon impact of a parsed receipt.
 *
 * - High-carbon choices earn no item bonus.
 * - Neutral choices earn {@link NEUTRAL_ITEM_KARMA}.
 * - Sustainable choices earn {@link SUSTAINABLE_ITEM_KARMA} and contribute to
 *   the estimated carbon saved.
 */
export function scoreReceiptKarma(
  items: ReadonlyArray<Pick<ParsedReceiptItem, 'sustainability_factor' | 'estimated_kg_co2'>>
): ReceiptKarmaBreakdown {
  let sustainableCount = 0;
  let neutralCount = 0;
  let highCarbonCount = 0;
  let totalEstimatedKgCO2 = 0;

  for (const item of items) {
    totalEstimatedKgCO2 += item.estimated_kg_co2 ?? 0;
    const factor: SustainabilityFactor = item.sustainability_factor;
    if (factor === 'sustainable') sustainableCount++;
    else if (factor === 'high_carbon') highCarbonCount++;
    else neutralCount++;
  }

  const itemKarma = sustainableCount * SUSTAINABLE_ITEM_KARMA + neutralCount * NEUTRAL_ITEM_KARMA;
  const totalKarma = BASE_UPLOAD_KARMA + itemKarma;
  const estimatedKgSaved = Math.round(sustainableCount * KG_SAVED_PER_SUSTAINABLE_ITEM * 100) / 100;

  return {
    sustainableCount,
    neutralCount,
    highCarbonCount,
    baseUploadKarma: BASE_UPLOAD_KARMA,
    itemKarma,
    totalKarma,
    estimatedKgSaved,
    totalEstimatedKgCO2: Math.round(totalEstimatedKgCO2 * 10000) / 10000,
  };
}
