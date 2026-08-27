import { db, type LearnSessionRow } from './db';

export type { LearnSessionRow };

export async function getLearnSession(deckId: number): Promise<LearnSessionRow | undefined> {
  return db.learnSessions.get(deckId);
}

export async function saveLearnSession(state: LearnSessionRow) {
  await db.learnSessions.put(state);
}

export async function clearLearnSession(deckId: number) {
  await db.learnSessions.delete(deckId);
}
