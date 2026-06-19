/**
 * Unit tests for Karma level system.
 * Tests getKarmaLevelInfo() for all levels, boundaries, progress, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { getKarmaLevelInfo, KARMA_LEVELS } from '@/lib/karma/types';

describe('getKarmaLevelInfo', () => {
  it('should return Seedling (level 1) for 0 points', () => {
    const info = getKarmaLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Seedling');
    expect(info.emoji).toBe('🌱');
  });

  it('should return Sapling (level 2) for exactly 100 points', () => {
    const info = getKarmaLevelInfo(100);
    expect(info.level).toBe(2);
    expect(info.title).toBe('Sapling');
  });

  it('should return Green Guardian (level 3) for 250 points', () => {
    const info = getKarmaLevelInfo(250);
    expect(info.level).toBe(3);
    expect(info.title).toBe('Green Guardian');
  });

  it('should return Earth Warrior (level 4) for 500 points', () => {
    const info = getKarmaLevelInfo(500);
    expect(info.level).toBe(4);
    expect(info.title).toBe('Earth Warrior');
  });

  it('should return Karma Yogi (level 5) for 1000 points', () => {
    const info = getKarmaLevelInfo(1000);
    expect(info.level).toBe(5);
    expect(info.title).toBe('Karma Yogi');
  });

  it('should return Nature Champion (level 6) for 2000 points', () => {
    const info = getKarmaLevelInfo(2000);
    expect(info.level).toBe(6);
    expect(info.title).toBe('Nature Champion');
  });

  it('should return Planet Protector (level 7) for 5000 points', () => {
    const info = getKarmaLevelInfo(5000);
    expect(info.level).toBe(7);
    expect(info.title).toBe('Planet Protector');
  });

  it('should return Climate Legend (level 8) for 10000 points', () => {
    const info = getKarmaLevelInfo(10000);
    expect(info.level).toBe(8);
    expect(info.title).toBe('Climate Legend');
  });

  it('should stay at level 1 for points just below level 2 threshold', () => {
    const info = getKarmaLevelInfo(99);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Seedling');
  });

  it('should handle negative points gracefully (stays at level 1)', () => {
    const info = getKarmaLevelInfo(-50);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Seedling');
  });

  it('should return max level for very large point values', () => {
    const info = getKarmaLevelInfo(999999);
    expect(info.level).toBe(8);
    expect(info.title).toBe('Climate Legend');
  });

  // ─── Progress Calculation ───────────────────────────────────────────────

  it('should calculate 0% progress at the start of a level', () => {
    const info = getKarmaLevelInfo(100); // start of level 2
    expect(info.progress).toBe(0);
  });

  it('should calculate 50% progress midway through a level', () => {
    // Level 2: 100–250, midpoint = 175
    const info = getKarmaLevelInfo(175);
    expect(info.progress).toBe(50);
  });

  it('should calculate 100% progress at max level', () => {
    const info = getKarmaLevelInfo(10000);
    expect(info.progress).toBe(100);
  });

  // ─── Next Level Info ───────────────────────────────────────────────────

  it('should include next level info when not at max', () => {
    const info = getKarmaLevelInfo(0);
    expect(info.nextLevel).not.toBeNull();
    expect(info.nextLevel!.level).toBe(2);
    expect(info.pointsToNext).toBe(100);
  });

  it('should have null nextLevel at max level', () => {
    const info = getKarmaLevelInfo(10000);
    expect(info.nextLevel).toBeNull();
    expect(info.pointsToNext).toBe(0);
  });

  it('should correctly report points needed to reach next level', () => {
    const info = getKarmaLevelInfo(200); // Level 2, need 250 for level 3
    expect(info.pointsToNext).toBe(50);
  });

  // ─── Constants Integrity ───────────────────────────────────────────────

  it('should have all 8 karma levels defined in ascending order', () => {
    expect(KARMA_LEVELS).toHaveLength(8);
    for (let i = 1; i < KARMA_LEVELS.length; i++) {
      expect(KARMA_LEVELS[i].minPoints).toBeGreaterThan(KARMA_LEVELS[i - 1].minPoints);
    }
  });

  it('should have unique titles for each level', () => {
    const titles = KARMA_LEVELS.map((l) => l.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
