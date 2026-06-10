/**
 * Karma-related type definitions and level system.
 */

export interface KarmaTransaction {
  id: string;
  userId: string;
  points: number;
  actionType: 'earned' | 'bonus' | 'streak' | 'community' | 'redeemed';
  description: string;
  carbonLogId: string | null;
  actionId: string | null;
  createdAt: string;
}

/** Karma level thresholds and titles */
export const KARMA_LEVELS = [
  { level: 1, minPoints: 0, title: 'Seedling', emoji: '🌱', color: '#86efac' },
  { level: 2, minPoints: 100, title: 'Sapling', emoji: '🌿', color: '#4ade80' },
  { level: 3, minPoints: 250, title: 'Green Guardian', emoji: '🌳', color: '#22c55e' },
  { level: 4, minPoints: 500, title: 'Earth Warrior', emoji: '⚡', color: '#16a34a' },
  { level: 5, minPoints: 1000, title: 'Karma Yogi', emoji: '🧘', color: '#15803d' },
  { level: 6, minPoints: 2000, title: 'Nature Champion', emoji: '🏆', color: '#166534' },
  { level: 7, minPoints: 5000, title: 'Planet Protector', emoji: '🌍', color: '#14532d' },
  { level: 8, minPoints: 10000, title: 'Climate Legend', emoji: '✨', color: '#fbbf24' },
] as const;

/**
 * Get the karma level info for a given point total.
 */
export function getKarmaLevelInfo(points: number) {
  let currentLevel: typeof KARMA_LEVELS[number] = KARMA_LEVELS[0];

  for (const level of KARMA_LEVELS) {
    if (points >= level.minPoints) {
      currentLevel = level;
    } else {
      break;
    }
  }

  // Find next level
  const currentIndex = KARMA_LEVELS.indexOf(currentLevel);
  const nextLevel = currentIndex < KARMA_LEVELS.length - 1
    ? KARMA_LEVELS[currentIndex + 1]
    : null;

  // Progress to next level (0-100%)
  const progress = nextLevel
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;

  return {
    ...currentLevel,
    progress: Math.min(progress, 100),
    nextLevel,
    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0,
  };
}
