export const MASTERY_KNEW_DELTA = 0.18;
export const MASTERY_DIDNT_PENALTY = 0.3;
const OPACITY_FLOOR = 0.02;

/**
 * 0 = new / weak, 1 = fully learned. "Knew it" nudges up; "Didn’t" nudges down.
 */
export function applyKnewMastery(mastery: number): number {
  return Math.min(1, Math.max(0, mastery + MASTERY_KNEW_DELTA));
}

export function applyDidntMastery(mastery: number): number {
  return Math.max(0, Math.min(1, mastery - MASTERY_DIDNT_PENALTY));
}

/**
 * High mastery => low opacity (favor audio). Clamped for legibility of new terms.
 */
export function masteryToTextOpacity(mastery: number, floor = OPACITY_FLOOR): number {
  if (mastery < 0 || mastery > 1) {
    throw new RangeError('mastery must be between 0 and 1');
  }
  return Math.max(floor, 1 - mastery);
}

const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

/** Shorter follow-up when the learner says they don’t know it. */
export function nextReviewAfterDidnt(from: Date): Date {
  return new Date(from.getTime() + 2 * MS_PER_MIN);
}

/**
 * Grows with mastery: first successes come back in minutes, high mastery in days (capped).
 */
export function nextReviewAfterKnew(mastery: number, from: Date): Date {
  if (mastery < 0 || mastery > 1) {
    throw new RangeError('mastery must be between 0 and 1');
  }
  // ~3 min at low mastery, up to ~30 days at high mastery
  const days = 0.12 * 2 ** (mastery * 8);
  const capped = Math.min(30, days);
  return new Date(from.getTime() + capped * MS_PER_DAY);
}
