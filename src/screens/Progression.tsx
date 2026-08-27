import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { dayKey } from '../utils/date';
import { levelFromXp } from '../gamification/xp';
import ProgressBar from '../components/ProgressBar';
import ChallengeStack from '../components/ChallengeStack';
import StreakBreakNotice from '../components/StreakBreakNotice';
import Mascot from '../components/Mascot';
import { computeStreak } from '../gamification/streak';
import { useStreakBreakNotice } from '../hooks/useStreakBreakNotice';
import { challengeStates, DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '../gamification/challenges';

export default function Progression() {
  const [streakNoticeDismissed, setStreakNoticeDismissed] = useState(false);
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), []);
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []);
  const claims = useLiveQuery(() => db.challengeClaims.toArray(), []);

  const streak = logs ? computeStreak(new Set(logs.map((l) => dayKey(l.reviewedAt)))) : 0;
  const lostStreak = useStreakBreakNotice(streak);
  const dailyStates = challengeStates(DAILY_CHALLENGES, logs ?? [], claims ?? []);
  const weeklyStates = challengeStates(WEEKLY_CHALLENGES, logs ?? [], claims ?? []);

  const totalXp = (xpEvents ?? []).reduce((sum, e) => sum + e.amount, 0);
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(totalXp);

  return (
    <div className="screen screen-enter">
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Progression</h1>

      {lostStreak !== null && !streakNoticeDismissed && (
        <StreakBreakNotice days={lostStreak} onDismiss={() => setStreakNoticeDismissed(true)} />
      )}

      <div
        className="card-surface card-enter"
        style={{
          padding: 20,
          marginBottom: 16,
          // The darker stop was #3a9401, which only gives --on-primary text 3.7:1 — under the
          // 4.5:1 AA floor for the small XP counter that sits near that corner. Lightened to
          // #43ac01 (same hue) so the text passes across the whole gradient.
          background: 'linear-gradient(135deg, #58cc02, #43ac01)',
          color: 'var(--on-primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 20 }}>Niveau {level}</div>
          <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 600 }}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </div>
        </div>
        <ProgressBar
          value={xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 1}
          color="#ffc800"
          trackColor="rgba(0, 0, 0, 0.35)"
          highlight="rgba(255, 255, 255, 0.5)"
        />
      </div>

      <div
        className="card-surface card-enter"
        style={{
          padding: 24,
          marginBottom: 16,
          textAlign: 'center',
          animationDelay: '40ms',
          // The lighter stop was #f0812a, which only gives white text 2.67:1 — fails even the
          // 3:1 large-text floor. Darkened to #ba590d (same hue) so white passes across the
          // whole gradient.
          background: 'linear-gradient(135deg, #ba590d, #c8342a)',
          color: 'white',
        }}
      >
        <div className={streak > 0 ? 'flame-pulse' : undefined} style={{ fontSize: 48 }}>
          🔥
        </div>
        <div
          className="tabular-nums"
          style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 36, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        >
          {streak}
        </div>
        <div
          style={{
            display: 'inline-block',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(0, 0, 0, 0.28)',
            padding: '3px 10px',
            borderRadius: 999,
            marginTop: 6,
          }}
        >
          jour{streak > 1 ? 's' : ''} de suite
        </div>
      </div>

      <ChallengeStack dailyStates={dailyStates} weeklyStates={weeklyStates} animationDelay="80ms" />

      <Mascot name="celebration" size={200} />
    </div>
  );
}
