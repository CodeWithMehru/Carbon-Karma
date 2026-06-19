/**
 * Unit tests for receipt karma scoring (lib/karma/scoring.ts).
 */

import { describe, it, expect } from 'vitest';
import {
  scoreReceiptKarma,
  BASE_UPLOAD_KARMA,
  SUSTAINABLE_ITEM_KARMA,
  NEUTRAL_ITEM_KARMA,
  KG_SAVED_PER_SUSTAINABLE_ITEM,
} from '@/lib/karma/scoring';
import type { ParsedReceiptItem } from '@/lib/ai/ai';

type ScoreItem = Pick<ParsedReceiptItem, 'sustainability_factor' | 'estimated_kg_co2'>;

const item = (
  sustainability_factor: ParsedReceiptItem['sustainability_factor'],
  estimated_kg_co2 = 1
): ScoreItem => ({ sustainability_factor, estimated_kg_co2 });

describe('scoreReceiptKarma', () => {
  it('awards only the base karma for an empty receipt', () => {
    const result = scoreReceiptKarma([]);
    expect(result.totalKarma).toBe(BASE_UPLOAD_KARMA);
    expect(result.itemKarma).toBe(0);
    expect(result.estimatedKgSaved).toBe(0);
    expect(result.totalEstimatedKgCO2).toBe(0);
  });

  it('adds the sustainable bonus and counts the saving', () => {
    const result = scoreReceiptKarma([item('sustainable', 0.3)]);
    expect(result.sustainableCount).toBe(1);
    expect(result.totalKarma).toBe(BASE_UPLOAD_KARMA + SUSTAINABLE_ITEM_KARMA);
    expect(result.estimatedKgSaved).toBe(KG_SAVED_PER_SUSTAINABLE_ITEM);
  });

  it('adds the neutral bonus but no saving', () => {
    const result = scoreReceiptKarma([item('neutral', 2)]);
    expect(result.neutralCount).toBe(1);
    expect(result.totalKarma).toBe(BASE_UPLOAD_KARMA + NEUTRAL_ITEM_KARMA);
    expect(result.estimatedKgSaved).toBe(0);
  });

  it('gives no item bonus for high-carbon choices', () => {
    const result = scoreReceiptKarma([item('high_carbon', 6)]);
    expect(result.highCarbonCount).toBe(1);
    expect(result.totalKarma).toBe(BASE_UPLOAD_KARMA);
  });

  it('scores a mixed basket correctly', () => {
    const result = scoreReceiptKarma([
      item('sustainable', 0.2),
      item('sustainable', 0.4),
      item('neutral', 1.5),
      item('high_carbon', 6),
    ]);
    expect(result.sustainableCount).toBe(2);
    expect(result.neutralCount).toBe(1);
    expect(result.highCarbonCount).toBe(1);
    // 50 base + 2*10 sustainable + 1*5 neutral = 75
    expect(result.totalKarma).toBe(75);
    expect(result.estimatedKgSaved).toBe(3);
  });

  it('sums the estimated footprint across all items', () => {
    const result = scoreReceiptKarma([
      item('sustainable', 0.25),
      item('neutral', 1.75),
      item('high_carbon', 6),
    ]);
    expect(result.totalEstimatedKgCO2).toBeCloseTo(8, 4);
  });

  it('rounds the estimated saving to two decimals', () => {
    const result = scoreReceiptKarma([
      item('sustainable'),
      item('sustainable'),
      item('sustainable'),
    ]);
    expect(result.estimatedKgSaved).toBe(4.5); // 3 * 1.5
  });
});
