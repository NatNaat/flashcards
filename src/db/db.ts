import Dexie, { type Table } from 'dexie';
import type { Card as FsrsCard } from 'ts-fsrs';

export interface Deck {
  id?: number;
  name: string;
  color: string;
  /** "svg:<key>" or "emoji:<char>"; absent means plain color badge. */
  icon?: string;
  createdAt: number;
  /** 0 means top-level (no parent). */
  parentId: number;
}

export type CardType = 'basic' | 'cloze';

export interface CardRecord extends FsrsCard {
  id?: number;
  deckId: number;
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
  id?: number;
  cardId: number;
  deckId: number;
  rating: number;
  reviewedAt: number;
  source?: ReviewSource;
}

export interface XpEvent {
  id?: number;
  amount: number;
  reason: string;
  createdAt: number;
}

export interface ChallengeClaim {
  id?: number;
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
  deckId: number;
  /** Cards that have cleared both phases and been graded into the FSRS rotation. */
  masteredIds: number[];
  /** The batch of cards currently being worked through. */
  roundIds: number[];
  phase: LearnPhase;
  /** Cards left to answer in the current phase; a miss sends the card to the back. */
  phaseQueue: number[];
  total: number;
  updatedAt: number;
}

class AppDB extends Dexie {
  decks!: Table<Deck, number>;
  cards!: Table<CardRecord, number>;
  reviewLogs!: Table<ReviewLogRecord, number>;
  xpEvents!: Table<XpEvent, number>;
  challengeClaims!: Table<ChallengeClaim, number>;
  appSettings!: Table<AppSetting, string>;
  learnSessions!: Table<LearnSessionRow, number>;

  constructor() {
    super('flashcards-db');
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
  }
}

export const db = new AppDB();
