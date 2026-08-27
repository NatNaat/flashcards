import { db } from './db';
import { ALL_CHALLENGES, logsForPeriod, periodKeyFor } from '../gamification/challenges';

/** XP awarded per graded card, by where the grade came from. */
export const XP_PER_REVIEW = 10;
export const XP_PER_LEARN = 15;

/**
 * Awards XP for any challenge whose target is met in its *current* period and that hasn't
 * already been claimed for that period. Claims are keyed by period, so daily challenges
 * naturally reset at midnight and weekly ones at the ISO week boundary. Idempotent.
 */
export async function claimChallengesIfComplete() {
  const now = Date.now();
  const logs = await db.reviewLogs.toArray();

  for (const challenge of ALL_CHALLENGES) {
    const periodKey = periodKeyFor(challenge, now);
    const already = await db.challengeClaims.where('date').equals(periodKey).toArray();
    if (already.some((c) => c.key === challenge.key)) continue;
    if (challenge.getProgress(logsForPeriod(challenge, logs, now)) < challenge.target) continue;

    await db.transaction('rw', db.challengeClaims, db.xpEvents, async () => {
      await db.challengeClaims.add({ date: periodKey, key: challenge.key, createdAt: now });
      await db.xpEvents.add({ amount: challenge.xp, reason: `challenge:${challenge.key}`, createdAt: Date.now() });
    });
  }
}
