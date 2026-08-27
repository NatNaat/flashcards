import { useEffect, useState } from 'react';
import { getLastKnownStreak, setLastKnownStreak } from '../db/settings';

/**
 * Returns the streak length that was just lost (the last time it was seen nonzero, now reset
 * to 0), or null the rest of the time. Every positive milestone here gets a celebration; a
 * broken streak previously reset silently, which is the single highest-risk emotional moment
 * for a streak-driven habit product.
 */
export function useStreakBreakNotice(streak: number): number | null {
  const [lostStreak, setLostStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const last = await getLastKnownStreak();
      if (!cancelled && last > 0 && streak === 0) setLostStreak(last);
      if (!cancelled) await setLastKnownStreak(streak);
    })();
    return () => {
      cancelled = true;
    };
  }, [streak]);

  return lostStreak;
}
