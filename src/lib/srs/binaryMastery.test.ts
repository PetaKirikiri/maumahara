import { describe, expect, it } from 'vitest';
import {
  applyDidntMastery,
  applyKnewMastery,
  MASTERY_DIDNT_PENALTY,
  MASTERY_KNEW_DELTA,
  masteryToTextOpacity,
  nextReviewAfterDidnt,
  nextReviewAfterKnew,
} from './binaryMastery';

describe('applyKnewMastery', () => {
  it('increments within bounds', () => {
    expect(applyKnewMastery(0)).toBe(MASTERY_KNEW_DELTA);
    expect(applyKnewMastery(1)).toBe(1);
    expect(applyKnewMastery(0.9)).toBe(1);
  });
});

describe('applyDidntMastery', () => {
  it('decrements within bounds', () => {
    expect(applyDidntMastery(0.4)).toBeCloseTo(0.1);
    expect(applyDidntMastery(0)).toBe(0);
  });
});

describe('masteryToTextOpacity', () => {
  it('fades out as mastery rises', () => {
    expect(masteryToTextOpacity(0)).toBe(1);
    expect(masteryToTextOpacity(1)).toBe(0.02);
  });
  it('rejects out-of-range mastery', () => {
    expect(() => masteryToTextOpacity(-0.1)).toThrow();
  });
});

describe('nextReviewAfterDidnt', () => {
  it('is a few minutes later', () => {
    const t = new Date('2026-01-01T12:00:00Z');
    const next = nextReviewAfterDidnt(t);
    expect(next.getTime() - t.getTime()).toBe(2 * 60_000);
  });
});

describe('nextReviewAfterKnew', () => {
  it('increases interval with higher mastery', () => {
    const t = new Date('2026-01-15T00:00:00Z');
    const low = nextReviewAfterKnew(0.1, t);
    const high = nextReviewAfterKnew(0.9, t);
    expect(high.getTime()).toBeGreaterThan(low.getTime());
  });
});
