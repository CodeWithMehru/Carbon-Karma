/**
 * Personalized carbon-reduction insights.
 *
 * `buildInsights` is a pure, deterministic engine that ranks the user's biggest
 * emission sources (from their baseline breakdown) and returns three targeted,
 * data-driven suggestions. It is fully unit-testable and serves as the reliable
 * fallback whenever the Gemini-powered insights route is unavailable.
 */

import type { BaselineAnswers } from '@/lib/carbon/types';
import { baselineQuizSchema } from '@/lib/validators/schemas';
import { calculateBaseline } from '@/lib/carbon/calculator';

export interface Insight {
  icon: string;
  title: string;
  desc: string;
  impact: string;
  category: string;
}

/** Neutral profile used only when a user's stored answers cannot be parsed. */
export const NEUTRAL_ANSWERS: BaselineAnswers = {
  householdSize: 3,
  electricityBillMonthly: 1500,
  cookingFuel: 'lpg',
  primaryTransport: 'petrol_car',
  dailyCommuteKm: 15,
  dietType: 'mixed',
  mealsPerDay: 3,
  flightsPerYear: 1,
  avgFlightHours: 2,
  shoppingFrequency: 'moderate',
};

/** Safely coerce stored JSON baseline data into typed answers (or null). */
export function parseBaselineAnswers(data: unknown): BaselineAnswers | null {
  const result = baselineQuizSchema.safeParse(data);
  return result.success ? result.data : null;
}

const CAR_MODES = new Set<BaselineAnswers['primaryTransport']>([
  'petrol_car',
  'diesel_car',
  'cng_auto',
]);

/** Format an estimated monthly saving (never below 1 kg so impact reads meaningfully). */
function monthlySaving(kg: number): string {
  return `Save ~${Math.max(1, Math.round(kg))} kg CO₂/mo`;
}

type InsightGenerator = (answers: BaselineAnswers, monthlyKg: number) => Insight;

/** One targeted generator per emission category, personalized to the user's answers. */
const GENERATORS: Record<string, InsightGenerator> = {
  transport: (answers, monthlyKg) => {
    if (CAR_MODES.has(answers.primaryTransport)) {
      return {
        icon: '🚲',
        category: 'transport',
        title: 'Switch 2 Commute Days',
        desc: 'Cycling or taking the Metro just two days a week can cut your commute emissions by around 40%.',
        impact: monthlySaving(monthlyKg * 0.4),
      };
    }
    if (answers.primaryTransport === 'two_wheeler') {
      return {
        icon: '🚌',
        category: 'transport',
        title: 'Hop on the Metro',
        desc: 'Swapping a few two-wheeler trips for the Metro or bus lowers both your fuel spend and emissions.',
        impact: monthlySaving(monthlyKg * 0.3),
      };
    }
    return {
      icon: '🗺️',
      category: 'transport',
      title: 'Combine Your Trips',
      desc: 'You already commute cleanly — batching errands into a single trip trims the little that remains.',
      impact: monthlySaving(monthlyKg * 0.15),
    };
  },
  food: (answers, monthlyKg) => {
    if (answers.dietType === 'non_veg' || answers.dietType === 'mixed') {
      return {
        icon: '🥗',
        category: 'food',
        title: 'Try Meatless Mondays',
        desc: 'Replacing one non-veg meal a day with a plant-based option is among the highest-impact food swaps.',
        impact: monthlySaving(monthlyKg * 0.25),
      };
    }
    return {
      icon: '🌾',
      category: 'food',
      title: 'Buy Local & Seasonal',
      desc: 'Locally grown, seasonal produce travels less and keeps your already-light diet even greener.',
      impact: monthlySaving(monthlyKg * 0.1),
    };
  },
  electricity: (answers, monthlyKg) => {
    if (answers.electricityBillMonthly >= 2000) {
      return {
        icon: '❄️',
        category: 'electricity',
        title: 'Cool Smarter at 26°C',
        desc: 'Setting your AC to 26°C instead of 22–24°C can cut cooling energy by up to 20% each cycle.',
        impact: monthlySaving(monthlyKg * 0.18),
      };
    }
    return {
      icon: '💡',
      category: 'electricity',
      title: 'Unplug Standby Devices',
      desc: 'Idle electronics still draw “phantom” power — switching them off at the socket saves energy and money.',
      impact: monthlySaving(monthlyKg * 0.08),
    };
  },
  cooking_fuel: (answers, monthlyKg) => {
    if (answers.cookingFuel === 'firewood' || answers.cookingFuel === 'lpg') {
      return {
        icon: '🍳',
        category: 'cooking_fuel',
        title: 'Cook with Induction',
        desc: 'An induction cooktop or piped natural gas burns cleaner than LPG cylinders or firewood.',
        impact: monthlySaving(monthlyKg * 0.3),
      };
    }
    return {
      icon: '🍲',
      category: 'cooking_fuel',
      title: 'Match Pan to Burner',
      desc: 'Using lids and right-sized burners shortens cooking time and trims fuel use.',
      impact: monthlySaving(monthlyKg * 0.1),
    };
  },
  flights: (answers, monthlyKg) => ({
    icon: '✈️',
    category: 'flights',
    title: answers.flightsPerYear > 4 ? 'Rethink Frequent Flights' : 'Rail Over Short Flights',
    desc: 'For trips under ~700 km, an AC train journey emits a small fraction of a domestic flight.',
    impact: monthlySaving(monthlyKg * 0.4),
  }),
  shopping: (answers, monthlyKg) => ({
    icon: '🛍️',
    category: 'shopping',
    title:
      answers.shoppingFrequency === 'frequent' ? 'Buy Less, Choose Well' : 'Choose Second-hand',
    desc: 'Buying pre-owned or repairing what you own avoids the embedded carbon of new manufacturing.',
    impact: monthlySaving(monthlyKg * 0.25),
  }),
};

/** Tie-breaker ordering when several categories have equal (e.g. zero) weight. */
const DEFAULT_ORDER = ['transport', 'food', 'electricity', 'cooking_fuel', 'shopping', 'flights'];

/**
 * Build exactly three personalized insights, prioritising the user's largest
 * emission sources. Categories with real emissions come first (ranked high→low);
 * any remaining slots are filled from {@link DEFAULT_ORDER} so the result is
 * always three distinct, useful suggestions.
 */
export function buildInsights(
  answers: BaselineAnswers,
  breakdown: Record<string, number>
): Insight[] {
  // Rank the categories we have a generator for by their emission weight (desc).
  const ranked = Object.keys(GENERATORS)
    .map((category) => ({ category, value: breakdown[category] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  // Candidate order: real emitters first, then DEFAULT_ORDER as filler so we can
  // always reach three even when the breakdown is sparse or all-zero.
  const queue = [
    ...ranked.filter((r) => r.value > 0),
    ...DEFAULT_ORDER.map((category) => ({ category, value: breakdown[category] ?? 0 })),
  ];

  // Walk the queue, generating one insight per distinct category until we have 3.
  const insights: Insight[] = [];
  const seen = new Set<string>();
  for (const { category, value } of queue) {
    if (seen.has(category)) continue;
    const generate = GENERATORS[category];
    if (!generate) continue;
    insights.push(generate(answers, value));
    seen.add(category);
    if (insights.length === 3) break;
  }
  return insights;
}

/**
 * Convenience wrapper: derive three insights directly from a profile's stored
 * baseline JSON, computing the emission breakdown and falling back to a neutral
 * profile if the data is missing or invalid. Used by the dashboard and the
 * Gemini insights route.
 */
export function getInsightsForProfile(baselineData: unknown): Insight[] {
  const answers = parseBaselineAnswers(baselineData) ?? NEUTRAL_ANSWERS;
  const breakdown = calculateBaseline(answers).breakdown ?? {};
  return buildInsights(answers, breakdown);
}
