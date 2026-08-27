import type { CardRecord } from '../db/db';

/**
 * Picks distractor answers, preferring ones close in length to the correct answer so the
 * correct option doesn't visually stick out as the odd one out (a classic multiple-choice
 * "tell"). The shortlist is still shuffled before slicing, so it isn't perfectly predictable.
 */
export function pickDistractors(pool: CardRecord[], current: CardRecord, count: number): string[] {
  const uniqueBacks = new Map<string, CardRecord>();
  for (const c of pool) {
    if (c.id === current.id || c.back === current.back) continue;
    if (!uniqueBacks.has(c.back)) uniqueBacks.set(c.back, c);
  }
  const targetLength = current.back.length;
  const byCloseness = Array.from(uniqueBacks.values()).sort(
    (a, b) => Math.abs(a.back.length - targetLength) - Math.abs(b.back.length - targetLength)
  );
  const shortlist = byCloseness.slice(0, Math.max(count * 2, 6));
  return shuffle(shortlist)
    .slice(0, count)
    .map((c) => c.back);
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/\s+/g, ' ');
}

export function isAnswerCorrect(input: string, answer: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(answer);
}
