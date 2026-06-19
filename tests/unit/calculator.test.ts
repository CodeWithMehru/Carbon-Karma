/**
 * Unit tests for carbon calculation functions.
 * Tests all categories, edge cases, negative values, and India-specific factors.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateElectricity,
  calculateTransport,
  calculateFood,
  calculateCookingFuel,
  calculateBaseline,
  calculateKarmaPoints,
  getKarmaLevel,
  toTreeEquivalent,
  buildCarbonSummary,
} from '@/lib/carbon/calculator';
import { ELECTRICITY_FACTOR, TRANSPORT_FACTORS, FOOD_FACTORS } from '@/lib/carbon/emission-factors';
import type { BaselineAnswers, CarbonCategory } from '@/lib/carbon/types';

// ─── Electricity ─────────────────────────────────────────────────────────────

describe('calculateElectricity', () => {
  it('should calculate CO2 for given kWh using India grid factor', () => {
    const result = calculateElectricity({ kwhConsumed: 100 });
    expect(result.kgCO2).toBe(100 * ELECTRICITY_FACTOR);
    expect(result.category).toBe('electricity');
  });

  it('should return 0 for 0 kWh', () => {
    const result = calculateElectricity({ kwhConsumed: 0 });
    expect(result.kgCO2).toBe(0);
  });

  it('should throw for negative kWh', () => {
    expect(() => calculateElectricity({ kwhConsumed: -10 })).toThrow('cannot be negative');
  });

  it('should handle very large values', () => {
    const result = calculateElectricity({ kwhConsumed: 1000000 });
    expect(result.kgCO2).toBe(1000000 * ELECTRICITY_FACTOR);
  });

  it('should handle decimal kWh values', () => {
    const result = calculateElectricity({ kwhConsumed: 0.5 });
    expect(result.kgCO2).toBeCloseTo(0.5 * ELECTRICITY_FACTOR, 4);
  });
});

// ─── Transport ───────────────────────────────────────────────────────────────

describe('calculateTransport', () => {
  it('should calculate CO2 for petrol car commute', () => {
    const result = calculateTransport({ mode: 'petrol_car', distanceKm: 20 });
    expect(result.kgCO2).toBeCloseTo(20 * TRANSPORT_FACTORS.petrol_car, 4);
    expect(result.category).toBe('transport');
  });

  it('should return 0 for bicycle', () => {
    const result = calculateTransport({ mode: 'bicycle', distanceKm: 15 });
    expect(result.kgCO2).toBe(0);
  });

  it('should return 0 for walking', () => {
    const result = calculateTransport({ mode: 'walking', distanceKm: 5 });
    expect(result.kgCO2).toBe(0);
  });

  it('should calculate domestic flight emissions', () => {
    const result = calculateTransport({ mode: 'domestic_flight', distanceKm: 1000 });
    expect(result.kgCO2).toBe(1000 * TRANSPORT_FACTORS.domestic_flight);
  });

  it('should calculate metro emissions (very low)', () => {
    const result = calculateTransport({ mode: 'metro', distanceKm: 30 });
    expect(result.kgCO2).toBeCloseTo(30 * TRANSPORT_FACTORS.metro, 4);
  });

  it('should throw for negative distance', () => {
    expect(() => calculateTransport({ mode: 'bus', distanceKm: -5 })).toThrow('cannot be negative');
  });

  it('should return 0 for 0 distance', () => {
    const result = calculateTransport({ mode: 'petrol_car', distanceKm: 0 });
    expect(result.kgCO2).toBe(0);
  });
});

// ─── Food ────────────────────────────────────────────────────────────────────

describe('calculateFood', () => {
  it('should calculate non-veg meal impact', () => {
    const result = calculateFood({ type: 'non_veg_meal', servings: 1 });
    expect(result.kgCO2).toBe(FOOD_FACTORS.non_veg_meal);
    expect(result.category).toBe('food');
  });

  it('should calculate multiple veg meals', () => {
    const result = calculateFood({ type: 'veg_meal', servings: 3 });
    expect(result.kgCO2).toBeCloseTo(3 * FOOD_FACTORS.veg_meal, 4);
  });

  it('should show vegan has lowest impact', () => {
    const vegan = calculateFood({ type: 'vegan_meal', servings: 1 });
    const veg = calculateFood({ type: 'veg_meal', servings: 1 });
    const nonVeg = calculateFood({ type: 'non_veg_meal', servings: 1 });
    expect(vegan.kgCO2).toBeLessThan(veg.kgCO2);
    expect(veg.kgCO2).toBeLessThan(nonVeg.kgCO2);
  });

  it('should throw for negative servings', () => {
    expect(() => calculateFood({ type: 'veg_meal', servings: -1 })).toThrow('cannot be negative');
  });

  it('should return 0 for 0 servings', () => {
    const result = calculateFood({ type: 'non_veg_meal', servings: 0 });
    expect(result.kgCO2).toBe(0);
  });
});

// ─── Cooking Fuel ────────────────────────────────────────────────────────────

describe('calculateCookingFuel', () => {
  it('should calculate LPG cylinder emissions', () => {
    const result = calculateCookingFuel('lpg_cylinder', 1);
    expect(result.kgCO2).toBe(44.0);
    expect(result.category).toBe('cooking_fuel');
  });

  it('should throw for negative quantity', () => {
    expect(() => calculateCookingFuel('lpg_cylinder', -1)).toThrow('cannot be negative');
  });

  it('should handle fractional cylinders', () => {
    const result = calculateCookingFuel('lpg_cylinder', 0.5);
    expect(result.kgCO2).toBe(22.0);
  });
});

// ─── Baseline Calculator ─────────────────────────────────────────────────────

describe('calculateBaseline', () => {
  const defaultAnswers: BaselineAnswers = {
    householdSize: 4,
    electricityBillMonthly: 2000,
    cookingFuel: 'lpg',
    primaryTransport: 'two_wheeler',
    dailyCommuteKm: 10,
    dietType: 'mixed',
    mealsPerDay: 3,
    flightsPerYear: 2,
    avgFlightHours: 2,
    shoppingFrequency: 'moderate',
  };

  it('should return a positive monthly estimate', () => {
    const result = calculateBaseline(defaultAnswers);
    expect(result.kgCO2).toBeGreaterThan(0);
  });

  it('should include category breakdown', () => {
    const result = calculateBaseline(defaultAnswers);
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown!.electricity).toBeGreaterThan(0);
    expect(result.breakdown!.food).toBeGreaterThan(0);
    expect(result.breakdown!.transport).toBeGreaterThanOrEqual(0);
  });

  it('should return lower emissions for vegan diet', () => {
    const veganAnswers = { ...defaultAnswers, dietType: 'vegan' as const };
    const nonVegAnswers = { ...defaultAnswers, dietType: 'non_veg' as const };
    const vegan = calculateBaseline(veganAnswers);
    const nonVeg = calculateBaseline(nonVegAnswers);
    expect(vegan.kgCO2).toBeLessThan(nonVeg.kgCO2);
  });

  it('should return lower transport for metro vs car', () => {
    const metro = calculateBaseline({ ...defaultAnswers, primaryTransport: 'metro' });
    const car = calculateBaseline({ ...defaultAnswers, primaryTransport: 'petrol_car' });
    expect(metro.breakdown!.transport).toBeLessThan(car.breakdown!.transport);
  });

  it('should scale cooking fuel per household size', () => {
    const small = calculateBaseline({ ...defaultAnswers, householdSize: 1 });
    const large = calculateBaseline({ ...defaultAnswers, householdSize: 4 });
    expect(small.breakdown!.cooking_fuel).toBeGreaterThan(large.breakdown!.cooking_fuel);
  });
});

// ─── Karma Points ────────────────────────────────────────────────────────────

describe('calculateKarmaPoints', () => {
  it('should return points based on kgCO2 saved', () => {
    expect(calculateKarmaPoints(1.0)).toBe(10);
    expect(calculateKarmaPoints(5.0)).toBe(50);
  });

  it('should apply difficulty multiplier', () => {
    const easy = calculateKarmaPoints(1.0, 'easy');
    const medium = calculateKarmaPoints(1.0, 'medium');
    const hard = calculateKarmaPoints(1.0, 'hard');
    expect(medium).toBe(easy * 2);
    expect(hard).toBe(easy * 3);
  });

  it('should return 0 for zero or negative savings', () => {
    expect(calculateKarmaPoints(0)).toBe(0);
    expect(calculateKarmaPoints(-5)).toBe(0);
  });

  it('should ceil small values', () => {
    expect(calculateKarmaPoints(0.05)).toBe(1); // ceil(0.5) = 1
  });
});

// ─── Karma Level ─────────────────────────────────────────────────────────────

describe('getKarmaLevel', () => {
  it('should return level 1 for 0 points', () => {
    expect(getKarmaLevel(0)).toBe(1);
  });

  it('should return level 2 for 100 points', () => {
    expect(getKarmaLevel(100)).toBe(2);
  });

  it('should handle large point values', () => {
    expect(getKarmaLevel(10000)).toBeGreaterThanOrEqual(1);
  });
});

// ─── Tree Equivalent ─────────────────────────────────────────────────────────

describe('toTreeEquivalent', () => {
  it('should convert kgCO2 to tree count', () => {
    expect(toTreeEquivalent(22)).toBe(1);
    expect(toTreeEquivalent(44)).toBe(2);
  });

  it('should handle 0', () => {
    expect(toTreeEquivalent(0)).toBe(0);
  });
});

// ─── Carbon Summary ──────────────────────────────────────────────────────────

describe('buildCarbonSummary', () => {
  it('should correctly sum emissions and savings', () => {
    const logs = [
      { kg_co2: 10, is_saving: false, category: 'transport' as CarbonCategory },
      { kg_co2: 5, is_saving: true, category: 'transport' as CarbonCategory },
      { kg_co2: 3, is_saving: false, category: 'food' as CarbonCategory },
    ];
    const summary = buildCarbonSummary(logs);
    expect(summary.totalEmittedKg).toBe(13);
    expect(summary.totalSavedKg).toBe(5);
    expect(summary.netKg).toBe(8);
    expect(summary.logCount).toBe(3);
  });

  it('should handle empty logs', () => {
    const summary = buildCarbonSummary([]);
    expect(summary.totalEmittedKg).toBe(0);
    expect(summary.totalSavedKg).toBe(0);
    expect(summary.logCount).toBe(0);
  });

  it('should build category breakdown', () => {
    const logs = [
      { kg_co2: 10, is_saving: false, category: 'electricity' as CarbonCategory },
      { kg_co2: 5, is_saving: false, category: 'electricity' as CarbonCategory },
      { kg_co2: 3, is_saving: false, category: 'food' as CarbonCategory },
    ];
    const summary = buildCarbonSummary(logs);
    expect(summary.categoryBreakdown.electricity).toBe(15);
    expect(summary.categoryBreakdown.food).toBe(3);
  });

  it('should handle savings-only logs', () => {
    const logs = [
      { kg_co2: 5, is_saving: true, category: 'transport' as CarbonCategory },
      { kg_co2: 3, is_saving: true, category: 'food' as CarbonCategory },
    ];
    const summary = buildCarbonSummary(logs);
    expect(summary.totalEmittedKg).toBe(0);
    expect(summary.totalSavedKg).toBe(8);
    expect(summary.netKg).toBe(-8);
  });

  it('should handle single-category logs', () => {
    const logs = [
      { kg_co2: 1, is_saving: false, category: 'electricity' as CarbonCategory },
      { kg_co2: 2, is_saving: false, category: 'electricity' as CarbonCategory },
    ];
    const summary = buildCarbonSummary(logs);
    expect(summary.categoryBreakdown.electricity).toBe(3);
    expect(Object.keys(summary.categoryBreakdown)).toHaveLength(1);
  });

  it('should calculate tree equivalent correctly', () => {
    const logs = [{ kg_co2: 22, is_saving: false, category: 'transport' as CarbonCategory }];
    const summary = buildCarbonSummary(logs);
    expect(summary.treeEquivalent).toBe(1);
  });
});

// ─── Additional Baseline Edge Cases ──────────────────────────────────────────

describe('calculateBaseline – extended edge cases', () => {
  const defaultAnswers: BaselineAnswers = {
    householdSize: 4,
    electricityBillMonthly: 2000,
    cookingFuel: 'lpg',
    primaryTransport: 'two_wheeler',
    dailyCommuteKm: 10,
    dietType: 'mixed',
    mealsPerDay: 3,
    flightsPerYear: 2,
    avgFlightHours: 2,
    shoppingFrequency: 'moderate',
  };

  it('should handle zero electricity bill', () => {
    const result = calculateBaseline({ ...defaultAnswers, electricityBillMonthly: 0 });
    expect(result.breakdown!.electricity).toBe(0);
    expect(result.kgCO2).toBeGreaterThan(0); // other categories still contribute
  });

  it('should handle zero daily commute', () => {
    const result = calculateBaseline({ ...defaultAnswers, dailyCommuteKm: 0 });
    expect(result.breakdown!.transport).toBe(0);
  });

  it('should handle zero flights per year', () => {
    const result = calculateBaseline({ ...defaultAnswers, flightsPerYear: 0 });
    expect(result.breakdown!.flights).toBe(0);
  });

  it('should handle all cooking fuel types', () => {
    const fuels = ['lpg', 'png', 'induction', 'firewood', 'mixed'] as const;
    fuels.forEach((fuel) => {
      const result = calculateBaseline({ ...defaultAnswers, cookingFuel: fuel });
      expect(result.breakdown!.cooking_fuel).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle all shopping frequencies', () => {
    const freqs = ['minimal', 'moderate', 'frequent'] as const;
    const results = freqs.map((f) =>
      calculateBaseline({ ...defaultAnswers, shoppingFrequency: f })
    );
    expect(results[0].breakdown!.shopping).toBeLessThan(results[1].breakdown!.shopping);
    expect(results[1].breakdown!.shopping).toBeLessThan(results[2].breakdown!.shopping);
  });

  it('should scale transport with commute distance', () => {
    const short = calculateBaseline({ ...defaultAnswers, dailyCommuteKm: 5 });
    const long = calculateBaseline({ ...defaultAnswers, dailyCommuteKm: 50 });
    expect(short.breakdown!.transport).toBeLessThan(long.breakdown!.transport);
  });

  it('should handle household size of 1', () => {
    const result = calculateBaseline({ ...defaultAnswers, householdSize: 1 });
    expect(result.breakdown!.cooking_fuel).toBeGreaterThan(0);
  });

  it('should scale food by meals per day', () => {
    const one = calculateBaseline({ ...defaultAnswers, mealsPerDay: 1 });
    const five = calculateBaseline({ ...defaultAnswers, mealsPerDay: 5 });
    expect(one.breakdown!.food).toBeLessThan(five.breakdown!.food);
  });
});

// ─── Additional Karma Edge Cases ─────────────────────────────────────────────

describe('calculateKarmaPoints – extended edge cases', () => {
  it('should handle very large kgCO2 values', () => {
    const result = calculateKarmaPoints(1000, 'hard');
    expect(result).toBe(10000 * 3);
  });

  it('should handle fractional kgCO2 correctly', () => {
    // 0.15 * 10 = 1.5, ceil = 2
    expect(calculateKarmaPoints(0.15)).toBe(2);
  });

  it('should return 0 for exactly 0 savings', () => {
    expect(calculateKarmaPoints(0, 'hard')).toBe(0);
  });
});

// ─── Additional Tree Equivalent Edge Cases ───────────────────────────────────

describe('toTreeEquivalent – extended edge cases', () => {
  it('should handle fractional trees', () => {
    expect(toTreeEquivalent(11)).toBe(0.5);
  });

  it('should handle very large CO2 values', () => {
    expect(toTreeEquivalent(2200)).toBe(100);
  });
});

// ─── Additional Karma Level Edge Cases ───────────────────────────────────────

describe('getKarmaLevel – extended edge cases', () => {
  it('should return level 1 for negative points', () => {
    expect(getKarmaLevel(-100)).toBe(1);
  });

  it('should return correct level for exact boundaries', () => {
    expect(getKarmaLevel(99)).toBe(1); // floor(99/100) + 1 = 1
    expect(getKarmaLevel(100)).toBe(2); // floor(100/100) + 1 = 2
    expect(getKarmaLevel(199)).toBe(2);
    expect(getKarmaLevel(200)).toBe(3);
  });

  it('should handle very large point totals', () => {
    const level = getKarmaLevel(1000000);
    expect(level).toBe(10001);
  });
});
