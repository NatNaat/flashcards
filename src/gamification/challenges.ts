import type { ReviewLogRecord } from '../db/db';
import { dayKey, weekKey } from '../utils/date';

export type ChallengePeriod = 'daily' | 'weekly';

export type Challenge = {
  key: string;
  label: string;
  target: number;
  xp: number;
  /** CSS color value used for this challenge's progress fill and claimed badge. */
  color: string;
  period: ChallengePeriod;
  getProgress: (periodLogs: ReviewLogRecord[]) => number;
};

export const DAILY_CHALLENGES: Challenge[] = [
  {
    key: 'review10',
    label: 'Révise 10 cartes',
    target: 10,
    xp: 30,
    color: 'var(--primary)',
    period: 'daily',
    getProgress: (logs) => logs.length,
  },
  {
    key: 'learn3',
    label: 'Apprends 3 cartes',
    target: 3,
    xp: 25,
    color: 'var(--good)',
    period: 'daily',
    getProgress: (logs) => logs.filter((l) => l.source === 'learn').length,
  },
  {
    key: 'twoDecks',
    label: 'Révise dans 2 decks différents',
    target: 2,
    xp: 20,
    color: 'var(--hard)',
    period: 'daily',
    getProgress: (logs) => new Set(logs.map((l) => l.deckId)).size,
  },
];

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    key: 'weekReview100',
    label: 'Révise 100 cartes cette semaine',
    target: 100,
    xp: 150,
    color: 'var(--primary)',
    period: 'weekly',
    getProgress: (logs) => logs.length,
  },
  {
    key: 'weekLearn20',
    label: 'Apprends 20 nouvelles cartes',
    target: 20,
    xp: 120,
    color: 'var(--good)',
    period: 'weekly',
    getProgress: (logs) => logs.filter((l) => l.source === 'learn').length,
  },
  {
    key: 'weekFiveDays',
    label: 'Révise 5 jours différents',
    target: 5,
    xp: 200,
    color: '#a855f7',
    period: 'weekly',
    getProgress: (logs) => new Set(logs.map((l) => dayKey(l.reviewedAt))).size,
  },
];

export const ALL_CHALLENGES: Challenge[] = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES];

/** The reset bucket a challenge is currently scored against — changing key === progress reset. */
export function periodKeyFor(challenge: Challenge, now = Date.now()): string {
  return challenge.period === 'daily' ? dayKey(now) : weekKey(now);
}

export function logsForPeriod(challenge: Challenge, logs: ReviewLogRecord[], now = Date.now()): ReviewLogRecord[] {
  const key = periodKeyFor(challenge, now);
  return challenge.period === 'daily'
    ? logs.filter((l) => dayKey(l.reviewedAt) === key)
    : logs.filter((l) => weekKey(l.reviewedAt) === key);
}

export type ChallengeState = { challenge: Challenge; progress: number; claimed: boolean };

export function challengeStates(
  challenges: Challenge[],
  logs: ReviewLogRecord[],
  claims: { date: string; key: string }[],
  now = Date.now()
): ChallengeState[] {
  return challenges.map((challenge) => {
    const periodKey = periodKeyFor(challenge, now);
    const progress = Math.min(challenge.getProgress(logsForPeriod(challenge, logs, now)), challenge.target);
    const claimed = claims.some((c) => c.key === challenge.key && c.date === periodKey);
    return { challenge, progress, claimed };
  });
}
