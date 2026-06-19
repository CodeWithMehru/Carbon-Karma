/**
 * Carbon footprint calculation engine.
 * Pure functions for computing CO2 emissions from various activities.
 * Uses India-specific emission factors from emission-factors.ts.
 */

import {
  ELECTRICITY_FACTOR,
  TRANSPORT_FACTORS,
  FOOD_FACTORS,
  COOKING_FUEL_FACTORS,
  BENCHMARKS,
} from './emission-factors';
import type {
  TransportInput,
  ElectricityInput,
  FoodInput,
  CarbonResult,
  BaselineAnswers,
  CarbonSummary,
  CarbonCategory,
} from './types';

/**
 * Calculate CO2 from electricity consumption.
 * @param input - kWh consumed
 * @returns CarbonResult with kgCO2
 */
export function calculateElectricity(input: ElectricityInput): CarbonResult {
  if (input.kwhConsumed < 0) {
    throw new Error('Electricity consumption cannot be negative');
  }

  const kgCO2 = roundTo(input.kwhConsumed * ELECTRICITY_FACTOR, 4);

  return {
    kgCO2,
    category: 'electricity',
    description: `${input.kwhConsumed} kWh × ${ELECTRICITY_FACTOR} kgCO2/kWh`,
  };
}

/**
 * Calculate CO2 from transport activity.
 * @param input - transport mode and distance in km
 * @returns CarbonResult with kgCO2
 */
export function calculateTransport(input: TransportInput): CarbonResult {
  if (input.distanceKm < 0) {
    throw new Error('Distance cannot be negative');
  }

  const factor = TRANSPORT_FACTORS[input.mode];
  const kgCO2 = roundTo(input.distanceKm * factor, 4);

  return {
    kgCO2,
    category: 'transport',
    description: `${input.distanceKm} km by ${formatTransportMode(input.mode)} (${factor} kgCO2/km)`,
  };
}

/**
 * Calculate CO2 from food consumption.
 * @param input - food type and number of servings
 * @returns CarbonResult with kgCO2
 */
export function calculateFood(input: FoodInput): CarbonResult {
  if (input.servings < 0) {
    throw new Error('Servings cannot be negative');
  }

  const factor = FOOD_FACTORS[input.type];
  const kgCO2 = roundTo(input.servings * factor, 4);

  return {
    kgCO2,
    category: 'food',
    description: `${input.servings} ${formatFoodType(input.type)} (${factor} kgCO2 each)`,
  };
}

/**
 * Calculate CO2 from cooking fuel usage.
 * @param fuelType - type of cooking fuel
 * @param quantity - amount consumed (cylinders, m³, kg, or kWh)
 * @returns CarbonResult with kgCO2
 */
export function calculateCookingFuel(
  fuelType: keyof typeof COOKING_FUEL_FACTORS,
  quantity: number
): CarbonResult {
  if (quantity < 0) {
    throw new Error('Fuel quantity cannot be negative');
  }

  const factor = COOKING_FUEL_FACTORS[fuelType];
  const kgCO2 = roundTo(quantity * factor, 4);

  return {
    kgCO2,
    category: 'cooking_fuel',
    description: `${quantity} units of ${fuelType} (${factor} kgCO2/unit)`,
  };
}

// ─── Baseline estimation assumptions (India-specific, directional) ───────────
// These translate quiz answers into monthly activity levels. They are documented
// as named constants so the model is auditable and the math is self-explaining.

/** Average residential electricity tariff used to derive kWh from the bill. */
const RUPEES_PER_KWH = 8;
/** Working days per month for commute estimation. */
const WORKING_DAYS_PER_MONTH = 22;
/** A commute is counted both ways (to work and back). */
const ROUND_TRIP_FACTOR = 2;
/** Approximate cruising distance covered per flight hour. */
const KM_PER_FLIGHT_HOUR = 800;
/** Used to spread annual flight emissions evenly across the year. */
const MONTHS_PER_YEAR = 12;
/** Days per month for meal-based food emissions. */
const DAYS_PER_MONTH = 30;

/** Typical monthly cooking-fuel usage per household, keyed by primary fuel. */
const COOKING_FUEL_MONTHLY_USAGE: Record<string, number> = {
  lpg: COOKING_FUEL_FACTORS.lpg_cylinder * 0.75, // ~0.75 cylinder/month for an avg household
  png: COOKING_FUEL_FACTORS.png_per_m3 * 15, // ~15 m³/month
  induction: COOKING_FUEL_FACTORS.induction_per_kwh * 30, // ~30 kWh/month
  firewood: COOKING_FUEL_FACTORS.firewood_per_kg * 60, // ~60 kg/month
  mixed: COOKING_FUEL_FACTORS.lpg_cylinder * 0.5 + COOKING_FUEL_FACTORS.induction_per_kwh * 15,
};

/** Directional monthly shopping-related kgCO2 by self-reported frequency. */
const SHOPPING_MONTHLY_KG: Record<string, number> = {
  minimal: 5,
  moderate: 15,
  frequent: 30,
};
/** Fallback when the shopping frequency is unrecognised. */
const SHOPPING_DEFAULT_KG = 10;

/**
 * Calculate monthly carbon baseline from onboarding quiz answers.
 * @param answers - completed baseline quiz answers
 * @returns Monthly kgCO2 estimate with category breakdown
 */
export function calculateBaseline(answers: BaselineAnswers): CarbonResult {
  const breakdown: Record<string, number> = {};

  // Electricity: estimate kWh from the monthly bill at the average tariff.
  const monthlyKwh = answers.electricityBillMonthly / RUPEES_PER_KWH;
  breakdown.electricity = roundTo(monthlyKwh * ELECTRICITY_FACTOR, 2);

  // Cooking fuel: monthly usage for the chosen fuel, shared across the household.
  breakdown.cooking_fuel = roundTo(
    (COOKING_FUEL_MONTHLY_USAGE[answers.cookingFuel] ?? 0) / answers.householdSize,
    2
  );

  // Transport: daily commute × round trip × working days.
  const transportFactor = TRANSPORT_FACTORS[answers.primaryTransport];
  const monthlyCommuteKm = answers.dailyCommuteKm * ROUND_TRIP_FACTOR * WORKING_DAYS_PER_MONTH;
  breakdown.transport = roundTo(monthlyCommuteKm * transportFactor, 2);

  // Flights: annual flight emissions spread evenly across the months.
  const avgFlightKm = answers.avgFlightHours * KM_PER_FLIGHT_HOUR;
  const monthlyFlightKg =
    (answers.flightsPerYear * avgFlightKm * TRANSPORT_FACTORS.domestic_flight) / MONTHS_PER_YEAR;
  breakdown.flights = roundTo(monthlyFlightKg, 2);

  // Food: per-meal factor by diet × meals/day × days/month.
  const mealFactor =
    answers.dietType === 'veg'
      ? FOOD_FACTORS.veg_meal
      : answers.dietType === 'vegan'
        ? FOOD_FACTORS.vegan_meal
        : answers.dietType === 'non_veg'
          ? FOOD_FACTORS.non_veg_meal
          : (FOOD_FACTORS.veg_meal + FOOD_FACTORS.non_veg_meal) / 2; // mixed
  breakdown.food = roundTo(answers.mealsPerDay * mealFactor * DAYS_PER_MONTH, 2);

  // Shopping: directional estimate by self-reported frequency.
  breakdown.shopping = roundTo(
    SHOPPING_MONTHLY_KG[answers.shoppingFrequency] ?? SHOPPING_DEFAULT_KG,
    2
  );

  const totalMonthlyKg = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    kgCO2: roundTo(totalMonthlyKg, 2),
    category: 'other',
    description: `Estimated monthly carbon footprint: ${roundTo(totalMonthlyKg, 1)} kgCO2`,
    breakdown,
  };
}

/**
 * Calculate karma points earned for a carbon-saving action.
 * Base: 1 point per 0.1 kgCO2 saved, with difficulty multiplier.
 */
export function calculateKarmaPoints(
  kgCO2Saved: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy'
): number {
  if (kgCO2Saved <= 0) return 0;

  const basePoints = Math.ceil(kgCO2Saved * 10);
  const multiplier = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;

  return basePoints * multiplier;
}

/**
 * Determine karma level from total points.
 * Levels increase every 100 points.
 */
export function getKarmaLevel(totalPoints: number): number {
  return Math.max(1, Math.floor(totalPoints / 100) + 1);
}

/**
 * Convert kgCO2 to equivalent number of trees needed.
 */
export function toTreeEquivalent(kgCO2: number): number {
  return roundTo(kgCO2 / BENCHMARKS.tree_absorption_annual_kg, 1);
}

/**
 * Build a carbon summary from an array of log entries.
 */
export function buildCarbonSummary(
  logs: Array<{ kg_co2: number; is_saving: boolean; category: CarbonCategory }>
): CarbonSummary {
  const categoryBreakdown = {} as Record<CarbonCategory, number>;

  let totalEmittedKg = 0;
  let totalSavedKg = 0;

  for (const log of logs) {
    if (log.is_saving) {
      totalSavedKg += log.kg_co2;
    } else {
      totalEmittedKg += log.kg_co2;
    }

    const current = categoryBreakdown[log.category] ?? 0;
    categoryBreakdown[log.category] = current + log.kg_co2;
  }

  return {
    totalEmittedKg: roundTo(totalEmittedKg, 2),
    totalSavedKg: roundTo(totalSavedKg, 2),
    netKg: roundTo(totalEmittedKg - totalSavedKg, 2),
    logCount: logs.length,
    categoryBreakdown,
    treeEquivalent: toTreeEquivalent(totalEmittedKg),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Round to a fixed number of decimals. Convention across this module: individual
 * activity calculations keep 4 decimals for precision, while user-facing
 * breakdown totals are rounded to 2 for readability.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function formatTransportMode(mode: string): string {
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFoodType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
