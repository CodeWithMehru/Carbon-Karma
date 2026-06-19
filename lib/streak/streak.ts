/**
 * Daily activity streak logic.
 *
 * A streak counts consecutive calendar days on which the user logged a
 * carbon-reducing action. Kept as a pure function so the (otherwise
 * date-sensitive) rules are deterministic and fully unit-testable.
 */

/** Milliseconds in one calendar day (used to derive a UTC day index). */
const MS_PER_DAY = 86_400_000;

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
}

export interface UpdateStreakInput {
  /** The most recent day the user was active before today (null if never). */
  lastActiveDate: Date | string | null | undefined;
  currentStreak: number;
  longestStreak: number;
  /** Defaults to the current date; injectable for deterministic tests. */
  today: Date | string;
}

/** Convert any date input to a UTC day index (days since epoch), ignoring time. */
function toDayIndex(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY);
}

/**
 * Compute the next streak state after an activity occurs on `today`.
 *
 * - First-ever activity → streak of 1.
 * - Same day as last activity → unchanged (already counted today).
 * - Exactly one day later → streak increments.
 * - A gap of two or more days → streak resets to 1.
 *
 * `longestStreak` always reflects the maximum streak ever reached.
 */
export function updateStreak(input: UpdateStreakInput): StreakState {
  const { lastActiveDate, today } = input;
  const currentStreak = Math.max(0, Math.floor(input.currentStreak) || 0);
  const longestStreak = Math.max(0, Math.floor(input.longestStreak) || 0);

  let nextStreak: number;

  if (!lastActiveDate) {
    nextStreak = 1;
  } else {
    const diff = toDayIndex(today) - toDayIndex(lastActiveDate);
    if (diff <= 0) {
      // Same calendar day (or clock skew) — keep the existing streak, min 1.
      nextStreak = Math.max(currentStreak, 1);
    } else if (diff === 1) {
      nextStreak = currentStreak + 1;
    } else {
      nextStreak = 1; // gap — start over
    }
  }

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
  };
}
