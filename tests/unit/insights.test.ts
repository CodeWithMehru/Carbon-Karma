/**
 * Unit tests for the personalized insights engine (lib/insights/insights.ts).
 * Verifies that insights are ranked by the user's biggest emission sources and
 * tailored to their specific baseline answers.
 */

import { describe, it, expect } from 'vitest';
import {
  buildInsights,
  parseBaselineAnswers,
  getInsightsForProfile,
  NEUTRAL_ANSWERS,
} from '@/lib/insights/insights';
import type { BaselineAnswers } from '@/lib/carbon/types';

const baseAnswers: BaselineAnswers = {
  householdSize: 4,
  electricityBillMonthly: 2500,
  cookingFuel: 'lpg',
  primaryTransport: 'petrol_car',
  dailyCommuteKm: 20,
  dietType: 'non_veg',
  mealsPerDay: 3,
  flightsPerYear: 2,
  avgFlightHours: 2,
  shoppingFrequency: 'frequent',
};

const breakdown = {
  transport: 100,
  food: 80,
  electricity: 60,
  cooking_fuel: 5,
  shopping: 1,
  flights: 0,
};

describe('buildInsights', () => {
  it('always returns exactly 3 insights', () => {
    expect(buildInsights(baseAnswers, breakdown)).toHaveLength(3);
  });

  it('prioritizes the three biggest emission sources', () => {
    const categories = buildInsights(baseAnswers, breakdown).map((i) => i.category);
    expect(categories).toEqual(['transport', 'food', 'electricity']);
  });

  it('returns distinct categories', () => {
    const categories = buildInsights(baseAnswers, breakdown).map((i) => i.category);
    expect(new Set(categories).size).toBe(3);
  });

  it('tailors the transport insight to car commuters', () => {
    const insight = buildInsights(baseAnswers, breakdown).find((i) => i.category === 'transport');
    expect(insight?.title).toBe('Switch 2 Commute Days');
  });

  it('tailors the transport insight to two-wheeler riders', () => {
    const insight = buildInsights(
      { ...baseAnswers, primaryTransport: 'two_wheeler' },
      breakdown
    ).find((i) => i.category === 'transport');
    expect(insight?.title).toBe('Hop on the Metro');
  });

  it('suggests meatless meals for non-veg diets', () => {
    const insight = buildInsights(baseAnswers, breakdown).find((i) => i.category === 'food');
    expect(insight?.title).toBe('Try Meatless Mondays');
  });

  it('suggests local produce for plant-based diets', () => {
    const insight = buildInsights({ ...baseAnswers, dietType: 'vegan' }, breakdown).find(
      (i) => i.category === 'food'
    );
    expect(insight?.title).toBe('Buy Local & Seasonal');
  });

  it('suggests AC efficiency for high electricity bills', () => {
    const insight = buildInsights(baseAnswers, breakdown).find((i) => i.category === 'electricity');
    expect(insight?.title).toBe('Cool Smarter at 26°C');
  });

  it('falls back to default ordering when there are no emissions', () => {
    const categories = buildInsights(baseAnswers, {}).map((i) => i.category);
    expect(categories).toEqual(['transport', 'food', 'electricity']);
  });

  it('produces an actionable, non-empty payload for every insight', () => {
    for (const insight of buildInsights(baseAnswers, breakdown)) {
      expect(insight.icon).toBeTruthy();
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.desc.length).toBeGreaterThan(10);
      expect(insight.impact).toContain('Save');
    }
  });
});

describe('parseBaselineAnswers', () => {
  it('returns typed answers for valid data', () => {
    expect(parseBaselineAnswers(baseAnswers)).toEqual(baseAnswers);
  });

  it('returns null for invalid data', () => {
    expect(parseBaselineAnswers({ householdSize: 'four' })).toBeNull();
  });

  it('returns null for null / non-object input', () => {
    expect(parseBaselineAnswers(null)).toBeNull();
    expect(parseBaselineAnswers('nope')).toBeNull();
  });

  it('accepts the neutral fallback profile', () => {
    expect(parseBaselineAnswers(NEUTRAL_ANSWERS)).not.toBeNull();
  });
});

describe('getInsightsForProfile', () => {
  it('returns 3 insights for valid baseline data', () => {
    expect(getInsightsForProfile(baseAnswers)).toHaveLength(3);
  });

  it('still returns 3 insights when baseline data is missing or invalid', () => {
    expect(getInsightsForProfile(null)).toHaveLength(3);
    expect(getInsightsForProfile({ garbage: true })).toHaveLength(3);
  });
});

describe('buildInsights — per-category tailoring', () => {
  // A breakdown that surfaces cooking_fuel, flights, and shopping as the top 3.
  const fuelHeavy = {
    cooking_fuel: 100,
    flights: 90,
    shopping: 80,
    transport: 1,
    food: 1,
    electricity: 1,
  };

  const titleFor = (
    answers: BaselineAnswers,
    breakdownArg: Record<string, number>,
    category: string
  ) => buildInsights(answers, breakdownArg).find((i) => i.category === category)?.title;

  it('recommends induction for LPG / firewood cooks', () => {
    expect(titleFor({ ...baseAnswers, cookingFuel: 'lpg' }, fuelHeavy, 'cooking_fuel')).toBe(
      'Cook with Induction'
    );
    expect(titleFor({ ...baseAnswers, cookingFuel: 'firewood' }, fuelHeavy, 'cooking_fuel')).toBe(
      'Cook with Induction'
    );
  });

  it('gives an efficiency tip for already-clean cooking fuel', () => {
    expect(titleFor({ ...baseAnswers, cookingFuel: 'induction' }, fuelHeavy, 'cooking_fuel')).toBe(
      'Match Pan to Burner'
    );
  });

  it('tailors the flight insight to frequency', () => {
    expect(titleFor({ ...baseAnswers, flightsPerYear: 2 }, fuelHeavy, 'flights')).toBe(
      'Rail Over Short Flights'
    );
    expect(titleFor({ ...baseAnswers, flightsPerYear: 8 }, fuelHeavy, 'flights')).toBe(
      'Rethink Frequent Flights'
    );
  });

  it('tailors the shopping insight to frequency', () => {
    expect(titleFor({ ...baseAnswers, shoppingFrequency: 'moderate' }, fuelHeavy, 'shopping')).toBe(
      'Choose Second-hand'
    );
    expect(titleFor({ ...baseAnswers, shoppingFrequency: 'frequent' }, fuelHeavy, 'shopping')).toBe(
      'Buy Less, Choose Well'
    );
  });

  it('suggests unplugging devices for modest electricity bills', () => {
    const answers = { ...baseAnswers, electricityBillMonthly: 800 };
    expect(titleFor(answers, { electricity: 100 }, 'electricity')).toBe('Unplug Standby Devices');
  });

  it('suggests combining trips for already-green commuters', () => {
    const answers = { ...baseAnswers, primaryTransport: 'metro' as const };
    expect(titleFor(answers, { transport: 100 }, 'transport')).toBe('Combine Your Trips');
  });
});
