import { db, type CardType } from './db';
import { newCardState } from '../scheduler/scheduler';

export type CardInput = {
  type?: CardType;
  clozeText?: string;
  tags?: string[];
};

export async function addCard(deckId: string, front: string, back: string, opts: CardInput = {}) {
  const fsrsState = newCardState();
  await db.cards.add({
    ...fsrsState,
    deckId,
    front,
    back,
    type: opts.type ?? 'basic',
    clozeText: opts.clozeText,
    tags: opts.tags,
    createdAt: Date.now(),
  });
}

export async function updateCard(
  cardId: string,
  fields: { front: string; back: string; type: CardType; clozeText?: string; tags?: string[] }
) {
  await db.cards.update(cardId, {
    front: fields.front,
    back: fields.back,
    type: fields.type,
    clozeText: fields.clozeText,
    tags: fields.tags,
  });
}

export async function setCardSuspended(cardId: string, suspended: boolean) {
  await db.cards.update(cardId, { suspended });
}

export async function deleteCard(cardId: string) {
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.delete(cardId);
    await db.reviewLogs.where('cardId').equals(cardId).delete();
  });
}
