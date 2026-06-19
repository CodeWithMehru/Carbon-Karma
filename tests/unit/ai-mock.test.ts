/**
 * Unit tests for the AI mock receipt parser.
 * Tests getMockReceiptResult() for structure, randomization, and data validity.
 */

import { describe, it, expect } from 'vitest';
import { getMockReceiptResult } from '@/lib/ai/ai';
import type { ParseReceiptResult } from '@/lib/ai/ai';

describe('getMockReceiptResult', () => {
  it('should return a valid ParseReceiptResult structure', () => {
    const result: ParseReceiptResult = getMockReceiptResult();

    expect(result).toHaveProperty('store_name');
    expect(result).toHaveProperty('total_inr');
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('overall_sustainability_score');
    expect(result).toHaveProperty('feedback_message');
  });

  it('should return between 3 and 6 items', () => {
    // Run multiple times to test randomness range
    for (let i = 0; i < 20; i++) {
      const result = getMockReceiptResult();
      expect(result.items.length).toBeGreaterThanOrEqual(3);
      expect(result.items.length).toBeLessThanOrEqual(6);
    }
  });

  it('should return a non-empty store name', () => {
    const result = getMockReceiptResult();
    expect(result.store_name.length).toBeGreaterThan(0);
  });

  it('should calculate total_inr as the sum of item prices', () => {
    const result = getMockReceiptResult();
    const expectedTotal = result.items.reduce((sum, item) => sum + item.price_inr, 0);
    expect(result.total_inr).toBe(expectedTotal);
  });

  it('should have a sustainability score between 0 and 100', () => {
    for (let i = 0; i < 20; i++) {
      const result = getMockReceiptResult();
      expect(result.overall_sustainability_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_sustainability_score).toBeLessThanOrEqual(100);
    }
  });

  it('should return a non-empty feedback message', () => {
    const result = getMockReceiptResult();
    expect(result.feedback_message.length).toBeGreaterThan(0);
  });

  it('each item should have all required fields', () => {
    const result = getMockReceiptResult();
    result.items.forEach((item) => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('unit');
      expect(item).toHaveProperty('price_inr');
      expect(item).toHaveProperty('estimated_kg_co2');
      expect(item).toHaveProperty('sustainability_factor');
    });
  });

  it('each item should have valid sustainability_factor values', () => {
    const validFactors = ['high_carbon', 'neutral', 'sustainable'];
    const result = getMockReceiptResult();
    result.items.forEach((item) => {
      expect(validFactors).toContain(item.sustainability_factor);
    });
  });

  it('should produce different results across multiple calls (randomization)', () => {
    const stores = new Set<string>();
    for (let i = 0; i < 10; i++) {
      stores.add(getMockReceiptResult().store_name);
    }
    // With 11 possible stores and 10 calls, we should see at least 2 different stores
    expect(stores.size).toBeGreaterThanOrEqual(2);
  });

  it('all items should have positive price and CO2 values', () => {
    const result = getMockReceiptResult();
    result.items.forEach((item) => {
      expect(item.price_inr).toBeGreaterThan(0);
      expect(item.estimated_kg_co2).toBeGreaterThanOrEqual(0);
      expect(item.quantity).toBeGreaterThan(0);
    });
  });
});
