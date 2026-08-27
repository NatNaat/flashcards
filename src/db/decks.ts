import { db } from './db';

export const DECK_PALETTE = [
  '#6C5CE7',
  '#1CB0F6',
  '#58CC02',
  '#FF9F43',
  '#FF4B4B',
  '#00CEC9',
  '#FD79A8',
  '#A29BFE',
  '#FDCB6E',
  '#636E72',
];

export type CreateDeckOptions = { parentId?: number; color?: string; icon?: string };

export async function createDeck(name: string, opts: CreateDeckOptions = {}): Promise<number> {
  const parentId = opts.parentId ?? 0;
  let color = opts.color;
  if (!color) {
    color = DECK_PALETTE[Math.floor(Math.random() * DECK_PALETTE.length)];
    if (parentId !== 0) {
      const parent = await db.decks.get(parentId);
      if (parent) color = parent.color;
    }
  }
  return db.decks.add({ name, color, icon: opts.icon, parentId, createdAt: Date.now() });
}

export async function updateDeckAppearance(deckId: number, color: string, icon?: string) {
  await db.decks.update(deckId, { color, icon });
}

export async function getChildDecks(parentId: number) {
  return db.decks.where('parentId').equals(parentId).sortBy('createdAt');
}

/** Returns this deck's id plus every descendant deck id (recursive), for aggregating review/stats across a subtree. */
export async function getDeckSubtreeIds(deckId: number): Promise<number[]> {
  const ids = [deckId];
  const children = await db.decks.where('parentId').equals(deckId).primaryKeys();
  for (const childId of children) {
    ids.push(...(await getDeckSubtreeIds(childId as number)));
  }
  return ids;
}

export async function deleteDeck(deckId: number) {
  const subtreeIds = await getDeckSubtreeIds(deckId);
  await db.transaction('rw', db.decks, db.cards, db.reviewLogs, async () => {
    const cardIds = await db.cards.where('deckId').anyOf(subtreeIds).primaryKeys();
    await db.cards.where('deckId').anyOf(subtreeIds).delete();
    await db.reviewLogs.where('cardId').anyOf(cardIds).delete();
    await db.decks.bulkDelete(subtreeIds);
  });
}
