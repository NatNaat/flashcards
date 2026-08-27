import { dayKey } from '../utils/date';

/** Consecutive days ending today (or yesterday, if nothing has been reviewed yet today). */
export function computeStreak(reviewDays: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = dayKey(cursor.getTime());
    if (reviewDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && key === dayKey(Date.now())) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}
