import { fsrs, generatorParameters, createEmptyCard, Rating, type Grade, type Card as FsrsCard } from 'ts-fsrs';
import { db, type CardRecord, type ReviewSource } from '../db/db';
import { claimChallengesIfComplete, XP_PER_LEARN, XP_PER_REVIEW } from '../db/gamification';

const params = generatorParameters({ enable_fuzz: true, request_retention: 0.9 });
const f = fsrs(params);

export { Rating };
export type { Grade };

export function newCardState(): FsrsCard {
  return createEmptyCard(new Date());
}

export function previewIntervals(card: CardRecord) {
  const record = f.repeat(card, new Date());
  return {
    [Rating.Again]: record[Rating.Again].card.due,
    [Rating.Hard]: record[Rating.Hard].card.due,
    [Rating.Good]: record[Rating.Good].card.due,
    [Rating.Easy]: record[Rating.Easy].card.due,
  };
}

export async function gradeCard(card: CardRecord, grade: Grade, source: ReviewSource = 'review') {
  const record = f.next(card, new Date(), grade);
  const { id, deckId, front, back, createdAt, type, clozeText, tags, suspended } = card;
  const updated: CardRecord = {
    ...record.card,
    id,
    deckId,
    front,
    back,
    createdAt,
    type,
    clozeText,
    tags,
    suspended,
  };
  await db.transaction('rw', db.cards, db.reviewLogs, db.xpEvents, async () => {
    await db.cards.put(updated);
    await db.reviewLogs.add({
      cardId: id!,
      deckId,
      rating: grade,
      reviewedAt: Date.now(),
      source,
    });
    await db.xpEvents.add({
      amount: source === 'learn' ? XP_PER_LEARN : XP_PER_REVIEW,
      reason: source,
      createdAt: Date.now(),
    });
  });
  await claimChallengesIfComplete();
  return updated;
}

export function formatDue(due: Date): string {
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return '<1m';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}j`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = (diffDays / 365).toFixed(1);
  return `${diffYears}an`;
}
