import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { getProfile } from '../db/profile';
import { dayKey } from '../utils/date';
import { computeStreak } from '../gamification/streak';
import { challengeStates, DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '../gamification/challenges';
import { buildChildrenMap, computeDeckStats } from '../utils/deckStats';
import DeckBadge from '../components/DeckBadge';
import ChallengeList from '../components/ChallengeList';
import Mascot from '../components/Mascot';
import { PlayFilledIcon, DecksIcon } from '../components/Icon';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Bonne nuit';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

export default function Home() {
  const navigate = useNavigate();

  const profile = useLiveQuery(() => getProfile(), []);
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), []);
  const decks = useLiveQuery(() => db.decks.toArray(), []);
  const cards = useLiveQuery(() => db.cards.toArray(), []);
  const learnSessions = useLiveQuery(() => db.learnSessions.toArray(), []);

  const claims = useLiveQuery(() => db.challengeClaims.toArray(), []);

  const streak = logs ? computeStreak(new Set(logs.map((l) => dayKey(l.reviewedAt)))) : 0;
  const dailyStates = challengeStates(DAILY_CHALLENGES, logs ?? [], claims ?? []);
  const weeklyStates = challengeStates(WEEKLY_CHALLENGES, logs ?? [], claims ?? []);

  const deckStats = useMemo(() => {
    if (!decks || !cards) return {};
    return computeDeckStats(decks, cards, buildChildrenMap(decks));
  }, [decks, cards]);

  /**
   * "Last deck" = whichever deck was touched most recently, by either an unfinished Learn
   * session or a graded review. The action then adapts to that deck's actual state so the
   * button never lands on an empty queue.
   */
  const resume = useMemo(() => {
    if (!decks || !logs || !learnSessions) return null;

    let bestDeckId: string | null = null;
    let bestAt = 0;
    for (const s of learnSessions) {
      if (s.updatedAt > bestAt) {
        bestAt = s.updatedAt;
        bestDeckId = s.deckId;
      }
    }
    for (const l of logs) {
      if (l.reviewedAt > bestAt) {
        bestAt = l.reviewedAt;
        bestDeckId = l.deckId;
      }
    }

    const deck = decks.find((d) => d.id === bestDeckId) ?? decks[0];
    if (!deck) return null;

    const stats = deckStats[deck.id!];
    const hasSession = learnSessions.some((s) => s.deckId === deck.id);
    if (hasSession) return { deck, to: `/learn/${deck.id}`, label: "Reprendre l'apprentissage", sub: deck.name };
    if ((stats?.due ?? 0) > 0) {
      return { deck, to: `/review/${deck.id}`, label: `Réviser ${stats.due} carte${stats.due > 1 ? 's' : ''}`, sub: deck.name };
    }
    if ((stats?.learn ?? 0) > 0) return { deck, to: `/learn/${deck.id}`, label: 'Apprendre de nouvelles cartes', sub: deck.name };
    return { deck, to: `/deck/${deck.id}`, label: 'Ouvrir le deck', sub: deck.name };
  }, [decks, logs, learnSessions, deckStats]);

  return (
    <div className="screen screen-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 26 }}>
            {greeting()}
            {profile?.name ? `, ${profile.name}` : ''}
          </h1>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 14, color: 'var(--text-dim)' }}>
              <span className="flame-pulse">🔥</span>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--text)' }}>
                {streak}
              </span>
              jour{streak > 1 ? 's' : ''} de suite
            </div>
          )}
        </div>
        {profile && <DeckBadge color={profile.color} icon={profile.icon} size={44} />}
      </div>

      {resume ? (
        <button
          className="btn-pill btn-primary card-enter"
          onClick={() => navigate(resume.to)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 20px',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PlayFilledIcon size={22} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 19 }}>{resume.label}</span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {resume.sub}
            </span>
          </span>
        </button>
      ) : (
        <button
          className="btn-pill card-enter"
          onClick={() => navigate('/decks')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 20px',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            marginBottom: 20,
            background: 'var(--surface-2)',
            color: 'var(--text)',
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>
            <DecksIcon size={22} />
          </span>
          <span style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 18 }}>Crée ton premier deck</span>
        </button>
      )}

      <div className="card-surface card-enter" style={{ padding: 18, marginBottom: 16, animationDelay: '60ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Défis du jour</div>
        <ChallengeList states={dailyStates} />
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, animationDelay: '100ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Défis de la semaine</div>
        <ChallengeList states={weeklyStates} />
      </div>

      <Mascot name="welcome" size={170} />
    </div>
  );
}
