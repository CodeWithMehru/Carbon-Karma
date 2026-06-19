/**
 * Carbon-related TypeScript type definitions.
 * Mirrors database enums and adds client-side types.
 */

import type { COOKING_FUEL_FACTORS } from './emission-factors';

export type CarbonCategory =
  | 'electricity'
  | 'transport'
  | 'food'
  | 'cooking_fuel'
  | 'waste'
  | 'shopping'
  | 'water'
  | 'other';

export type TransportMode =
  | 'petrol_car'
  | 'diesel_car'
  | 'electric_car'
  | 'cng_auto'
  | 'two_wheeler'
  | 'bus'
  | 'metro'
  | 'train'
  | 'domestic_flight'
  | 'international_flight'
  | 'bicycle'
  | 'walking';

export type FoodType =
  | 'veg_meal'
  | 'non_veg_meal'
  | 'vegan_meal'
  | 'dairy_product'
  | 'packaged_food';

export type KarmaActionType = 'earned' | 'bonus' | 'streak' | 'community' | 'redeemed';

export type LogSource = 'manual' | 'ai_receipt' | 'ai_photo' | 'action_library' | 'baseline_quiz';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/** Input for transport carbon calculation */
export interface TransportInput {
  mode: TransportMode;
  distanceKm: number;
}

/** Input for electricity carbon calculation */
export interface ElectricityInput {
  kwhConsumed: number;
}

/** Input for food carbon calculation */
export interface FoodInput {
  type: FoodType;
  servings: number;
}

/** Input for cooking fuel carbon calculation */
export interface CookingFuelInput {
  fuelType: keyof typeof COOKING_FUEL_FACTORS;
  quantity: number;
}

/** Generic calculation result */
export interface CarbonResult {
  kgCO2: number;
  category: CarbonCategory;
  description: string;
  breakdown?: Record<string, number>;
}

/** Baseline quiz answer structure */
export interface BaselineAnswers {
  householdSize: number;
  electricityBillMonthly: number; // in INR
  cookingFuel: 'lpg' | 'png' | 'induction' | 'firewood' | 'mixed';
  primaryTransport: TransportMode;
  dailyCommuteKm: number;
  dietType: 'veg' | 'non_veg' | 'vegan' | 'mixed';
  mealsPerDay: number;
  flightsPerYear: number;
  avgFlightHours: number;
  shoppingFrequency: 'minimal' | 'moderate' | 'frequent';
}

/** Dashboard summary data */
export interface CarbonSummary {
  totalEmittedKg: number;
  totalSavedKg: number;
  netKg: number;
  logCount: number;
  categoryBreakdown: Record<CarbonCategory, number>;
  treeEquivalent: number;
}

/** Ripple event for the live feed */
export interface RippleEvent {
  id: string;
  city: string | null;
  category: CarbonCategory;
  kgCO2Saved: number;
  actionDescription: string;
  emoji: string;
  createdAt: string;
}
