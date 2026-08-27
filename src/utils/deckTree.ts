import type { Deck } from '../db/db';

export type DeckTreeItem = { deck: Deck; depth: number };

/** Flattens the deck hierarchy into an indented, depth-first list (parents before their children). */
export function buildDeckTree(decks: Deck[]): DeckTreeItem[] {
  const childrenMap: Record<string, Deck[]> = {};
  decks.forEach((d) => {
    (childrenMap[d.parentId] ??= []).push(d);
  });
  Object.values(childrenMap).forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt));

  const result: DeckTreeItem[] = [];
  function walk(parentId: string, depth: number) {
    (childrenMap[parentId] ?? []).forEach((deck) => {
      result.push({ deck, depth });
      walk(deck.id!, depth + 1);
    });
  }
  walk('', 0);
  return result;
}
