/**
 * Unit tests for daily streak logic (lib/streak/streak.ts).
 */

import { describe, it, expect } from 'vitest';
import { updateStreak } from '@/lib/streak/streak';

describe('updateStreak', () => {
  it('starts a streak on first-ever activity', () => {
    const result = updateStreak({
      lastActiveDate: null,
      currentStreak: 0,
      longestStreak: 0,
      today: '2026-06-18',
    });
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it('increments on a consecutive day', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-17',
      currentStreak: 3,
      longestStreak: 5,
      today: '2026-06-18',
    });
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(5);
  });

  it('extends the longest streak when a new record is set', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-17',
      currentStreak: 5,
      longestStreak: 5,
      today: '2026-06-18',
    });
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it('keeps the streak unchanged for multiple activities on the same day', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-18',
      currentStreak: 4,
      longestStreak: 7,
      today: '2026-06-18',
    });
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(7);
  });

  it('resets to 1 after a gap of two or more days', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-15',
      currentStreak: 10,
      longestStreak: 10,
      today: '2026-06-18',
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
  });

  it('ignores the time of day (compares calendar dates only)', () => {
    const result = updateStreak({
      lastActiveDate: new Date('2026-06-17T23:30:00Z'),
      currentStreak: 2,
      longestStreak: 2,
      today: new Date('2026-06-18T00:30:00Z'),
    });
    expect(result.currentStreak).toBe(3);
  });

  it('treats a same-day activity with a fresh (0) streak as 1', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-18',
      currentStreak: 0,
      longestStreak: 0,
      today: '2026-06-18',
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('preserves the streak under clock skew (today before last activity)', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-19',
      currentStreak: 5,
      longestStreak: 5,
      today: '2026-06-18', // earlier than lastActive → diff < 0
    });
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('floors a fractional current streak before incrementing', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-18',
      currentStreak: 3.7,
      longestStreak: 5,
      today: '2026-06-19',
    });
    expect(result.currentStreak).toBe(4); // floor(3.7) = 3, +1
    expect(result.longestStreak).toBe(5);
  });

  it('handles very large streak values', () => {
    const result = updateStreak({
      lastActiveDate: '2026-06-18',
      currentStreak: 10000,
      longestStreak: 10000,
      today: '2026-06-19',
    });
    expect(result.currentStreak).toBe(10001);
    expect(result.longestStreak).toBe(10001);
  });

  it('increments correctly with mixed Date and string inputs', () => {
    const result = updateStreak({
      lastActiveDate: new Date('2026-06-18T23:59:59Z'),
      currentStreak: 2,
      longestStreak: 2,
      today: '2026-06-19',
    });
    expect(result.currentStreak).toBe(3);
  });
});
