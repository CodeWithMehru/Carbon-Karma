/**
 * Unit tests for Zod validation schemas.
 * Tests all schemas for valid inputs, boundary values, and rejection cases.
 */

import { describe, it, expect } from 'vitest';
import {
  baselineQuizSchema,
  signUpSchema,
  signInSchema,
  createCarbonLogSchema,
  carbonCategorySchema,
  transportModeSchema,
  foodTypeSchema,
  chatMessageSchema,
  updateProfileSchema,
  insightSchema,
  insightsResultSchema,
} from '@/lib/validators/schemas';

// ─── Carbon Category Enum ────────────────────────────────────────────────────

describe('carbonCategorySchema', () => {
  it('should accept all valid categories', () => {
    const categories = [
      'electricity',
      'transport',
      'food',
      'cooking_fuel',
      'waste',
      'shopping',
      'water',
      'other',
    ];
    categories.forEach((c) => {
      expect(carbonCategorySchema.safeParse(c).success).toBe(true);
    });
  });

  it('should reject invalid categories', () => {
    expect(carbonCategorySchema.safeParse('invalid').success).toBe(false);
    expect(carbonCategorySchema.safeParse('').success).toBe(false);
    expect(carbonCategorySchema.safeParse(123).success).toBe(false);
  });
});

// ─── Transport Mode Enum ────────────────────────────────────────────────────

describe('transportModeSchema', () => {
  it('should accept all valid transport modes', () => {
    const modes = [
      'petrol_car',
      'diesel_car',
      'electric_car',
      'cng_auto',
      'two_wheeler',
      'bus',
      'metro',
      'train',
      'domestic_flight',
      'international_flight',
      'bicycle',
      'walking',
    ];
    modes.forEach((m) => {
      expect(transportModeSchema.safeParse(m).success).toBe(true);
    });
  });

  it('should reject invalid modes', () => {
    expect(transportModeSchema.safeParse('helicopter').success).toBe(false);
  });
});

// ─── Food Type Enum ─────────────────────────────────────────────────────────

describe('foodTypeSchema', () => {
  it('should accept all valid food types', () => {
    const types = ['veg_meal', 'non_veg_meal', 'vegan_meal', 'dairy_product', 'packaged_food'];
    types.forEach((t) => {
      expect(foodTypeSchema.safeParse(t).success).toBe(true);
    });
  });

  it('should reject invalid food types', () => {
    expect(foodTypeSchema.safeParse('junk_food').success).toBe(false);
  });
});

// ─── Baseline Quiz Schema ───────────────────────────────────────────────────

describe('baselineQuizSchema', () => {
  const validQuiz = {
    householdSize: 4,
    electricityBillMonthly: 2000,
    cookingFuel: 'lpg',
    primaryTransport: 'two_wheeler',
    dailyCommuteKm: 10,
    dietType: 'veg',
    mealsPerDay: 3,
    flightsPerYear: 2,
    avgFlightHours: 2,
    shoppingFrequency: 'moderate',
  };

  it('should accept a valid quiz submission', () => {
    const result = baselineQuizSchema.safeParse(validQuiz);
    expect(result.success).toBe(true);
  });

  it('should reject householdSize of 0', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, householdSize: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject householdSize > 20', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, householdSize: 21 });
    expect(result.success).toBe(false);
  });

  it('should reject negative electricity bill', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, electricityBillMonthly: -500 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid cooking fuel type', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, cookingFuel: 'coal' });
    expect(result.success).toBe(false);
  });

  it('should reject negative commute distance', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, dailyCommuteKm: -5 });
    expect(result.success).toBe(false);
  });

  it('should reject commute distance > 500 km', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, dailyCommuteKm: 501 });
    expect(result.success).toBe(false);
  });

  it('should reject mealsPerDay > 10', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, mealsPerDay: 11 });
    expect(result.success).toBe(false);
  });

  it('should accept boundary value: mealsPerDay = 1', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, mealsPerDay: 1 });
    expect(result.success).toBe(true);
  });

  it('should accept all valid diet types', () => {
    ['veg', 'non_veg', 'vegan', 'mixed'].forEach((diet) => {
      const result = baselineQuizSchema.safeParse({ ...validQuiz, dietType: diet });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid shopping frequency', () => {
    const result = baselineQuizSchema.safeParse({ ...validQuiz, shoppingFrequency: 'always' });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = baselineQuizSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Sign Up Schema ─────────────────────────────────────────────────────────

describe('signUpSchema', () => {
  it('should accept a valid signup', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'Secure1Password',
      fullName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = signUpSchema.safeParse({
      email: 'not-an-email',
      password: 'Secure1Password',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without uppercase', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'nouppercase1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'NoNumberHere',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'Ab1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name shorter than 2 characters', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'Secure1Password',
      fullName: 'A',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Sign In Schema ─────────────────────────────────────────────────────────

describe('signInSchema', () => {
  it('should accept valid sign in', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: 'anypass' });
    expect(result.success).toBe(true);
  });

  it('should reject empty password', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = signInSchema.safeParse({ email: 'bad', password: 'password' });
    expect(result.success).toBe(false);
  });
});

// ─── Create Carbon Log Schema ───────────────────────────────────────────────

describe('createCarbonLogSchema', () => {
  it('should accept a valid carbon log entry', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'transport',
      kg_co2: 5.5,
      description: 'Commuted by bus',
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative kg_co2', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'transport',
      kg_co2: -1,
      description: 'Bad entry',
    });
    expect(result.success).toBe(false);
  });

  it('should reject kg_co2 above maximum (100000)', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'transport',
      kg_co2: 100001,
      description: 'Too large',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'food',
      kg_co2: 1.0,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('should default is_saving to false', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'food',
      kg_co2: 1.0,
      description: 'A meal',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_saving).toBe(false);
    }
  });

  it('should default source to manual', () => {
    const result = createCarbonLogSchema.safeParse({
      category: 'food',
      kg_co2: 1.0,
      description: 'A meal',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('manual');
    }
  });
});

// ─── Chat Message Schema ────────────────────────────────────────────────────

describe('chatMessageSchema', () => {
  it('should accept a valid message', () => {
    const result = chatMessageSchema.safeParse({ content: 'Hello, how can I reduce emissions?' });
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const result = chatMessageSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('should reject content exceeding 5000 characters', () => {
    const result = chatMessageSchema.safeParse({ content: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('should accept content at exactly 5000 characters', () => {
    const result = chatMessageSchema.safeParse({ content: 'x'.repeat(5000) });
    expect(result.success).toBe(true);
  });
});

// ─── Update Profile Schema ──────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('should accept a valid update', () => {
    const result = updateProfileSchema.safeParse({ display_name: 'Mehru', city: 'Bangalore' });
    expect(result.success).toBe(true);
  });

  it('should accept an empty object (all fields optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject display_name that is empty string', () => {
    const result = updateProfileSchema.safeParse({ display_name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept boolean accessibility flags', () => {
    const result = updateProfileSchema.safeParse({
      high_contrast_mode: true,
      dyslexia_font: false,
    });
    expect(result.success).toBe(true);
  });

  it('should accept display_name at the 1 and 100 char boundaries', () => {
    expect(updateProfileSchema.safeParse({ display_name: 'a' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ display_name: 'x'.repeat(100) }).success).toBe(true);
  });

  it('should reject display_name longer than 100 chars', () => {
    expect(updateProfileSchema.safeParse({ display_name: 'x'.repeat(101) }).success).toBe(false);
  });
});

// ─── Baseline Quiz — inclusive numeric boundaries ────────────────────────────

describe('baselineQuizSchema — numeric boundaries', () => {
  const validBaseline = {
    householdSize: 4,
    electricityBillMonthly: 2000,
    cookingFuel: 'lpg' as const,
    primaryTransport: 'two_wheeler' as const,
    dailyCommuteKm: 10,
    dietType: 'mixed' as const,
    mealsPerDay: 3,
    flightsPerYear: 2,
    avgFlightHours: 2,
    shoppingFrequency: 'moderate' as const,
  };

  it('accepts every field at its inclusive maximum', () => {
    const result = baselineQuizSchema.safeParse({
      ...validBaseline,
      householdSize: 20,
      electricityBillMonthly: 100000,
      dailyCommuteKm: 500,
      mealsPerDay: 10,
      flightsPerYear: 100,
      avgFlightHours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('accepts the minimum allowed flights (0) and flight hours (0)', () => {
    const result = baselineQuizSchema.safeParse({
      ...validBaseline,
      flightsPerYear: 0,
      avgFlightHours: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects values just past each maximum', () => {
    expect(baselineQuizSchema.safeParse({ ...validBaseline, mealsPerDay: 11 }).success).toBe(false);
    expect(baselineQuizSchema.safeParse({ ...validBaseline, flightsPerYear: 101 }).success).toBe(
      false
    );
    expect(baselineQuizSchema.safeParse({ ...validBaseline, avgFlightHours: 25 }).success).toBe(
      false
    );
    expect(baselineQuizSchema.safeParse({ ...validBaseline, householdSize: 21 }).success).toBe(
      false
    );
  });

  it('rejects a non-integer meal count', () => {
    expect(baselineQuizSchema.safeParse({ ...validBaseline, mealsPerDay: 3.5 }).success).toBe(
      false
    );
  });
});

// ─── Carbon Log — boundary values ────────────────────────────────────────────

describe('createCarbonLogSchema — boundaries', () => {
  const base = { category: 'transport' as const, description: 'Commute' };

  it('accepts kg_co2 at the inclusive maximum (100000)', () => {
    expect(createCarbonLogSchema.safeParse({ ...base, kg_co2: 100000 }).success).toBe(true);
  });

  it('rejects kg_co2 above the maximum', () => {
    expect(createCarbonLogSchema.safeParse({ ...base, kg_co2: 100000.01 }).success).toBe(false);
  });

  it('accepts description at the 1 and 500 char boundaries', () => {
    expect(
      createCarbonLogSchema.safeParse({ category: 'food', kg_co2: 1, description: 'x' }).success
    ).toBe(true);
    expect(
      createCarbonLogSchema.safeParse({ category: 'food', kg_co2: 1, description: 'x'.repeat(500) })
        .success
    ).toBe(true);
  });

  it('rejects an empty or over-long description', () => {
    expect(createCarbonLogSchema.safeParse({ ...base, kg_co2: 1, description: '' }).success).toBe(
      false
    );
    expect(
      createCarbonLogSchema.safeParse({ ...base, kg_co2: 1, description: 'x'.repeat(501) }).success
    ).toBe(false);
  });
});

// ─── Sign-up password & name rules (boundaries) ──────────────────────────────

describe('signUpSchema — password & name boundaries', () => {
  it('accepts a password exactly at the 8-char minimum with one uppercase and one number', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Abcdef12',
      fullName: 'Asha Rao',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password missing an uppercase letter or a number', () => {
    expect(
      signUpSchema.safeParse({ email: 'u@e.com', password: 'abcdef12', fullName: 'Asha' }).success
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ email: 'u@e.com', password: 'Abcdefgh', fullName: 'Asha' }).success
    ).toBe(false);
  });

  it('accepts fullName at the 2 and 100 char boundaries, rejects 1', () => {
    expect(
      signUpSchema.safeParse({ email: 'u@e.com', password: 'Abcdef12', fullName: 'Jo' }).success
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ email: 'u@e.com', password: 'Abcdef12', fullName: 'x'.repeat(100) })
        .success
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ email: 'u@e.com', password: 'Abcdef12', fullName: 'J' }).success
    ).toBe(false);
  });
});

// ─── Insight schemas ─────────────────────────────────────────────────────────

describe('insightSchema / insightsResultSchema', () => {
  const validInsight = {
    icon: '🚲',
    title: 'Switch 2 Commute Days',
    desc: 'Cycle or take the Metro two days a week to cut commute emissions.',
    impact: 'Save ~12 kg CO₂/mo',
    category: 'transport',
  };

  it('accepts a well-formed insight (category optional)', () => {
    expect(insightSchema.safeParse(validInsight).success).toBe(true);
    const { icon, title, desc, impact } = validInsight;
    expect(insightSchema.safeParse({ icon, title, desc, impact }).success).toBe(true);
  });

  it('rejects an empty icon or an over-long title', () => {
    expect(insightSchema.safeParse({ ...validInsight, icon: '' }).success).toBe(false);
    expect(insightSchema.safeParse({ ...validInsight, title: 'x'.repeat(61) }).success).toBe(false);
  });

  it('accepts result arrays from 1 up to 6 insights', () => {
    expect(insightsResultSchema.safeParse([validInsight]).success).toBe(true);
    expect(insightsResultSchema.safeParse(Array(6).fill(validInsight)).success).toBe(true);
  });

  it('rejects an empty array or more than 6 insights', () => {
    expect(insightsResultSchema.safeParse([]).success).toBe(false);
    expect(insightsResultSchema.safeParse(Array(7).fill(validInsight)).success).toBe(false);
  });
});
