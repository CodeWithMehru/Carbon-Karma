/**
 * Zod validation schemas for all data inputs.
 * Used for API request validation and form validation.
 */

import { z } from 'zod';

// ─── Enum Schemas ────────────────────────────────────────────────────────────

export const carbonCategorySchema = z.enum([
  'electricity', 'transport', 'food', 'cooking_fuel',
  'waste', 'shopping', 'water', 'other',
]);

export const transportModeSchema = z.enum([
  'petrol_car', 'diesel_car', 'electric_car', 'cng_auto',
  'two_wheeler', 'bus', 'metro', 'train',
  'domestic_flight', 'international_flight', 'bicycle', 'walking',
]);

export const foodTypeSchema = z.enum([
  'veg_meal', 'non_veg_meal', 'vegan_meal', 'dairy_product', 'packaged_food',
]);

export const logSourceSchema = z.enum([
  'manual', 'ai_receipt', 'ai_photo', 'action_library', 'baseline_quiz',
]);

// ─── Carbon Log Schemas ─────────────────────────────────────────────────────

export const createCarbonLogSchema = z.object({
  category: carbonCategorySchema,
  subcategory: z.string().max(100).optional(),
  kg_co2: z.number().nonnegative().max(100000),
  is_saving: z.boolean().default(false),
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().max(50).optional(),
  source: logSourceSchema.default('manual'),
  ai_confidence: z.number().min(0).max(1).optional(),
  logged_at: z.string().datetime().optional(),
});

export type CreateCarbonLogInput = z.infer<typeof createCarbonLogSchema>;

// ─── Baseline Quiz Schema ────────────────────────────────────────────────────

export const baselineQuizSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  electricityBillMonthly: z.number().nonnegative().max(100000),
  cookingFuel: z.enum(['lpg', 'png', 'induction', 'firewood', 'mixed']),
  primaryTransport: transportModeSchema,
  dailyCommuteKm: z.number().nonnegative().max(500),
  dietType: z.enum(['veg', 'non_veg', 'vegan', 'mixed']),
  mealsPerDay: z.number().int().min(1).max(10),
  flightsPerYear: z.number().int().nonnegative().max(100),
  avgFlightHours: z.number().nonnegative().max(24),
  shoppingFrequency: z.enum(['minimal', 'moderate', 'frequent']),
});

export type BaselineQuizInput = z.infer<typeof baselineQuizSchema>;

// ─── Profile Schemas ─────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  high_contrast_mode: z.boolean().optional(),
  dyslexia_font: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── AI Receipt Parse Schema ─────────────────────────────────────────────────

export const receiptParseResultSchema = z.object({
  category: carbonCategorySchema,
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().nonnegative(),
    unit: z.string(),
    kgCO2: z.number().nonnegative(),
  })),
  totalKgCO2: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  description: z.string(),
});

export type ReceiptParseResult = z.infer<typeof receiptParseResultSchema>;

// ─── Chat Message Schema ─────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});
