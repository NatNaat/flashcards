import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { dayKey } from '../utils/date';
import { levelFromXp } from '../gamification/xp';
import ProgressBar from '../components/ProgressBar';
import ChallengeList from '../components/ChallengeList';
import Mascot from '../components/Mascot';
import { computeStreak } from '../gamification/streak';
import { challengeStates, DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '../gamification/challenges';

export default function Progression() {
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), []);
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []);
  const claims = useLiveQuery(() => db.challengeClaims.toArray(), []);

  const streak = logs ? computeStreak(new Set(logs.map((l) => dayKey(l.reviewedAt)))) : 0;
  const dailyStates = challengeStates(DAILY_CHALLENGES, logs ?? [], claims ?? []);
  const weeklyStates = challengeStates(WEEKLY_CHALLENGES, logs ?? [], claims ?? []);

  const totalXp = (xpEvents ?? []).reduce((sum, e) => sum + e.amount, 0);
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(totalXp);

  return (
    <div className="screen screen-enter">
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Progression</h1>

      <div
        className="card-surface card-enter"
        style={{
          padding: 20,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #58cc02, #3a9401)',
          color: 'var(--on-primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 20 }}>Niveau {level}</div>
          <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
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
          background: 'linear-gradient(135deg, #f0812a, #c8342a)',
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
            background: 'rgba(0, 0, 0, 0.18)',
            padding: '3px 10px',
            borderRadius: 999,
            marginTop: 6,
          }}
        >
          jour{streak > 1 ? 's' : ''} de suite
        </div>
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, marginBottom: 16, animationDelay: '80ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Défis du jour</div>
        <ChallengeList states={dailyStates} />
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, animationDelay: '120ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Défis de la semaine</div>
        <ChallengeList states={weeklyStates} />
      </div>

      <Mascot name="celebration" size={200} />
    </div>
  );
}
