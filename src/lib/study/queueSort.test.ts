import { describe, expect, it } from 'vitest';
import { sortWordQueue } from './queueSort';
import type { MasteryRow } from '@/types/maumahara';

const base = (w: string, m: MasteryRow): MasteryRow => ({
  id: '1',
  user_id: 'u',
  word_text: w,
  next_review_at: m.next_review_at,
  updated_at: m.updated_at,
  mastery: m.mastery,
});

describe('sortWordQueue', () => {
  it('orders due before future', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    const a = { word_text: 'a' };
    const b = { word_text: 'b' };
    const map = new Map<string, MasteryRow>([
      ['a', base('a', { next_review_at: '2025-12-01T00:00:00Z', updated_at: '', mastery: 0.2 })],
      [
        'b',
        base('b', { next_review_at: '2026-12-01T00:00:00Z', updated_at: '', mastery: 0.5 }),
      ],
    ]);
    const q = sortWordQueue([a, b], map, now);
    expect(q[0].word_text).toBe('a');
  });
  it('puts new (no row) first among due', () => {
    const now = new Date('2026-01-10T12:00:00Z');
    const a = { word_text: 'a' };
    const b = { word_text: 'b' };
    const map = new Map<string, MasteryRow>([
      ['b', base('b', { next_review_at: '2020-01-01T00:00:00Z', updated_at: '', mastery: 0.1 })],
    ]);
    const q = sortWordQueue([a, b], map, now);
    expect(q[0].word_text).toBe('a');
  });
});
