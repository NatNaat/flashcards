import type { CardRecord, Deck } from '../db/db';

export type DeckStats = { due: number; total: number; mastered: number; learn: number; subdeckCount: number };

export function buildChildrenMap(decks: Deck[]): Record<number, Deck[]> {
  const map: Record<number, Deck[]> = {};
  decks.forEach((d) => {
    (map[d.parentId] ??= []).push(d);
  });
  Object.values(map).forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt));
  return map;
}

/** Aggregates due/total/mastered/subdeck counts across each deck's whole subtree. */
export function computeDeckStats(
  decks: Deck[],
  cards: CardRecord[],
  childrenMap: Record<number, Deck[]>
): Record<number, DeckStats> {
  const now = Date.now();
  const perDeck: Record<number, { due: number; total: number; mastered: number; learn: number }> = {};
  for (const c of cards) {
    const entry = (perDeck[c.deckId] ??= { due: 0, total: 0, mastered: 0, learn: 0 });
    entry.total += 1;
    if (c.state === 2) entry.mastered += 1;
    if (c.suspended) continue;
    if (new Date(c.due).getTime() <= now) entry.due += 1;
    if (c.state !== 2) entry.learn += 1;
  }

  function subtreeIds(deckId: number): number[] {
    const ids = [deckId];
    (childrenMap[deckId] ?? []).forEach((child) => ids.push(...subtreeIds(child.id!)));
    return ids;
  }

  const aggregated: Record<number, DeckStats> = {};
  for (const deck of decks) {
    const ids = subtreeIds(deck.id!);
    const agg: DeckStats = { due: 0, total: 0, mastered: 0, learn: 0, subdeckCount: ids.length - 1 };
    for (const deckId of ids) {
      const s = perDeck[deckId];
      if (s) {
        agg.due += s.due;
        agg.total += s.total;
        agg.mastered += s.mastered;
        agg.learn += s.learn;
      }
    }
    aggregated[deck.id!] = agg;
  }
  return aggregated;
}
