import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Card as FsrsCard } from 'ts-fsrs';

export interface Deck {
  id?: string;
  name: string;
  color: string;
  /** "svg:<key>" or "emoji:<char>"; absent means plain color badge. */
  icon?: string;
  createdAt: number;
  /** '' means top-level (no parent). */
  parentId: string;
}

export type CardType = 'basic' | 'cloze';

export interface CardRecord extends FsrsCard {
  id?: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
  type?: CardType;
  clozeText?: string;
  tags?: string[];
  suspended?: boolean;
}

export type ReviewSource = 'review' | 'learn';

export interface ReviewLogRecord {
  id?: string;
  cardId: string;
  deckId: string;
  rating: number;
  reviewedAt: number;
  source?: ReviewSource;
}

export interface XpEvent {
  id?: string;
  amount: number;
  reason: string;
  createdAt: number;
}

export interface ChallengeClaim {
  id?: string;
  /** Local day key, e.g. "2026-7-14" (year-month-day, month 0-indexed). */
  date: string;
  key: string;
  createdAt: number;
}

export interface AppSetting {
  key: string;
  value: unknown;
}

export type LearnPhase = 'mc' | 'written';

export interface LearnSessionRow {
  deckId: string;
  /** Cards that have cleared both phases and been graded into the FSRS rotation. */
  masteredIds: string[];
  /** The batch of cards currently being worked through. */
  roundIds: string[];
  phase: LearnPhase;
  /** Cards left to answer in the current phase; a miss sends the card to the back. */
  phaseQueue: string[];
  total: number;
  updatedAt: number;
}

class AppDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<CardRecord, string>;
  reviewLogs!: Table<ReviewLogRecord, string>;
  xpEvents!: Table<XpEvent, string>;
  challengeClaims!: Table<ChallengeClaim, string>;
  appSettings!: Table<AppSetting, string>;
  learnSessions!: Table<LearnSessionRow, string>;

  constructor() {
    super('flashcards-db', { addons: [dexieCloud] });
    this.version(1).stores({
      decks: '++id, name, createdAt',
      cards: '++id, deckId, due, state, createdAt',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
    });
    this.version(2).stores({
      decks: '++id, name, createdAt',
      cards: '++id, deckId, due, state, createdAt, *tags',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
    });
    this.version(3)
      .stores({
        decks: '++id, name, createdAt, parentId',
        cards: '++id, deckId, due, state, createdAt, *tags',
        reviewLogs: '++id, cardId, deckId, reviewedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('decks')
          .toCollection()
          .modify((deck) => {
            if (deck.parentId === undefined) deck.parentId = 0;
          });
      });
    this.version(4).stores({
      decks: '++id, name, createdAt, parentId',
      cards: '++id, deckId, due, state, createdAt, *tags',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      xpEvents: '++id, createdAt',
      challengeClaims: '++id, date, key',
    });
    this.version(5).stores({
      decks: '++id, name, createdAt, parentId',
      cards: '++id, deckId, due, state, createdAt, *tags',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      xpEvents: '++id, createdAt',
      challengeClaims: '++id, date, key',
      appSettings: 'key',
    });
    this.version(6).stores({
      decks: '++id, name, createdAt, parentId',
      cards: '++id, deckId, due, state, createdAt, *tags',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      xpEvents: '++id, createdAt',
      challengeClaims: '++id, date, key',
      appSettings: 'key',
      learnSessions: 'deckId',
    });
    this.version(7)
      .stores({
        decks: '++id, name, createdAt, parentId',
        cards: '++id, deckId, due, state, createdAt, *tags',
        reviewLogs: '++id, cardId, deckId, reviewedAt',
        xpEvents: '++id, createdAt',
        challengeClaims: '++id, date, key',
        appSettings: 'key',
        learnSessions: 'deckId',
      })
      .upgrade(async (tx) => {
        // Learn sessions moved from a single rotating queue to phased rounds; the old
        // rows can't be translated, so drop them and let those decks start fresh.
        await tx.table('learnSessions').clear();
      });

    // Dexie Cloud requires globally-unique string primary keys ('@id'), not auto-incrementing
    // numbers — two offline devices could otherwise both mint id 5 for different records. Since
    // IndexedDB can't change a store's primary key in place (Dexie throws "not yet support for
    // changing primary key"), this runs the standard rename-dance: copy every row into a
    // sibling "New" table with the new id scheme and remapped foreign keys (v8), drop the old
    // tables (v9), then recreate them under their real names from the "New" copies (v10).
    const V8_STORES = {
      decks: '++id, name, createdAt, parentId',
      cards: '++id, deckId, due, state, createdAt, *tags',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      xpEvents: '++id, createdAt',
      challengeClaims: '++id, date, key',
      appSettings: 'key',
      learnSessions: 'deckId',
      decksNew: '@id, name, createdAt, parentId',
      cardsNew: '@id, deckId, due, state, createdAt, *tags',
      reviewLogsNew: '@id, cardId, deckId, reviewedAt',
      xpEventsNew: '@id, createdAt',
      challengeClaimsNew: '@id, date, key',
      learnSessionsNew: 'deckId',
    };
    this.version(8)
      .stores(V8_STORES)
      .upgrade(async (tx) => {
        const [oldDecks, oldCards, oldReviewLogs, oldXpEvents, oldChallengeClaims, oldLearnSessions] = await Promise.all([
          tx.table('decks').toArray(),
          tx.table('cards').toArray(),
          tx.table('reviewLogs').toArray(),
          tx.table('xpEvents').toArray(),
          tx.table('challengeClaims').toArray(),
          tx.table('learnSessions').toArray(),
        ]);

        const deckIdMap = new Map<number, string>(oldDecks.map((d) => [d.id, crypto.randomUUID()]));
        const cardIdMap = new Map<number, string>(oldCards.map((c) => [c.id, crypto.randomUUID()]));
        const mapCardIds = (ids: number[]) => ids.map((cid) => cardIdMap.get(cid)).filter((x): x is string => !!x);

        await tx.table('decksNew').bulkAdd(
          oldDecks.map((d) => ({
            ...d,
            id: deckIdMap.get(d.id)!,
            parentId: d.parentId === 0 ? '' : (deckIdMap.get(d.parentId) ?? ''),
          }))
        );
        await tx.table('cardsNew').bulkAdd(
          oldCards
            .filter((c) => deckIdMap.has(c.deckId))
            .map((c) => ({ ...c, id: cardIdMap.get(c.id)!, deckId: deckIdMap.get(c.deckId)! }))
        );
        await tx.table('reviewLogsNew').bulkAdd(
          oldReviewLogs
            .filter((l) => cardIdMap.has(l.cardId) && deckIdMap.has(l.deckId))
            .map((l) => ({ ...l, id: crypto.randomUUID(), cardId: cardIdMap.get(l.cardId)!, deckId: deckIdMap.get(l.deckId)! }))
        );
        await tx.table('xpEventsNew').bulkAdd(oldXpEvents.map((e) => ({ ...e, id: crypto.randomUUID() })));
        await tx.table('challengeClaimsNew').bulkAdd(oldChallengeClaims.map((c) => ({ ...c, id: crypto.randomUUID() })));
        await tx.table('learnSessionsNew').bulkAdd(
          oldLearnSessions
            .filter((s) => deckIdMap.has(s.deckId))
            .map((s) => ({
              ...s,
              deckId: deckIdMap.get(s.deckId)!,
              masteredIds: mapCardIds(s.masteredIds),
              roundIds: mapCardIds(s.roundIds),
              phaseQueue: mapCardIds(s.phaseQueue),
            }))
        );
      });
    this.version(9).stores({
      ...V8_STORES,
      decks: null,
      cards: null,
      reviewLogs: null,
      xpEvents: null,
      challengeClaims: null,
      learnSessions: null,
    });
    this.version(10)
      .stores({
        decks: '@id, name, createdAt, parentId',
        cards: '@id, deckId, due, state, createdAt, *tags',
        reviewLogs: '@id, cardId, deckId, reviewedAt',
        xpEvents: '@id, createdAt',
        challengeClaims: '@id, date, key',
        appSettings: 'key',
        learnSessions: 'deckId',
        decksNew: null,
        cardsNew: null,
        reviewLogsNew: null,
        xpEventsNew: null,
        challengeClaimsNew: null,
        learnSessionsNew: null,
      })
      .upgrade(async (tx) => {
        await tx.table('decks').bulkAdd(await tx.table('decksNew').toArray());
        await tx.table('cards').bulkAdd(await tx.table('cardsNew').toArray());
        await tx.table('reviewLogs').bulkAdd(await tx.table('reviewLogsNew').toArray());
        await tx.table('xpEvents').bulkAdd(await tx.table('xpEventsNew').toArray());
        await tx.table('challengeClaims').bulkAdd(await tx.table('challengeClaimsNew').toArray());
        await tx.table('learnSessions').bulkAdd(await tx.table('learnSessionsNew').toArray());
      });

    // The addon must always be configured — even with no addons.configure() call at all, it
    // rejects writes to every table (including old ones mid-migration) with a primary-key
    // ConstraintError. Without a database URL yet (before `npx dexie-cloud create` has been
    // run), this configures it in a local-only, non-syncing mode instead of skipping it.
    const databaseUrl = import.meta.env.VITE_DEXIE_CLOUD_URL ?? '';
    this.cloud.configure(databaseUrl ? { databaseUrl, requireAuth: true } : { databaseUrl, requireAuth: false });
  }
}

export const db = new AppDB();
