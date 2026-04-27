import type { MasteryRow } from '@/types/maumahara';

type Word = { word_text: string };

/** Prefer due (or new) terms; then by oldest due; then by soonest future review. */
export function compareStudyOrder(
  a: Word,
  b: Word,
  masteryByText: ReadonlyMap<string, MasteryRow>,
  nowMs: number,
): number {
  const ma = masteryByText.get(a.word_text);
  const mb = masteryByText.get(b.word_text);
  const dueA = !ma || Date.parse(ma.next_review_at) <= nowMs;
  const dueB = !mb || Date.parse(mb.next_review_at) <= nowMs;
  if (dueA !== dueB) return dueA ? -1 : 1;
  const nextA = ma ? Date.parse(ma.next_review_at) : 0;
  const nextB = mb ? Date.parse(mb.next_review_at) : 0;
  if (nextA !== nextB) return nextA - nextB;
  return a.word_text.localeCompare(b.word_text);
}

export function sortWordQueue(
  words: Word[],
  masteryByText: ReadonlyMap<string, MasteryRow>,
  now: Date = new Date(),
): Word[] {
  const nowMs = now.getTime();
  return [...words].sort((a, b) => compareStudyOrder(a, b, masteryByText, nowMs));
}
