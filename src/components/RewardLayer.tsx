import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type XpEvent } from '../db/db';
import { levelFromXp } from '../gamification/xp';
import { ALL_CHALLENGES } from '../gamification/challenges';
import ParticleBurst from './ParticleBurst';

type Reward =
  | { kind: 'level'; level: number }
  | { kind: 'challenge'; label: string; xp: number; color: string };

type Toast = { id: number; amount: number };

const REWARD_MS = 2600;
const TOAST_MS = 1700;

/**
 * Watches XP and challenge claims app-wide and plays the celebration for anything that
 * happens *after* mount — existing history is recorded as a baseline on first read so
 * opening the app never replays past rewards.
 */
export default function RewardLayer() {
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []);
  const claims = useLiveQuery(() => db.challengeClaims.toArray(), []);

  const [queue, setQueue] = useState<Reward[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const seenLevel = useRef<number | null>(null);
  const seenXpId = useRef<number | null>(null);
  const seenClaimIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!xpEvents) return;
    const total = xpEvents.reduce((sum, e) => sum + e.amount, 0);
    const { level } = levelFromXp(total);
    const maxId = xpEvents.reduce((m: number, e: XpEvent) => Math.max(m, e.id ?? 0), 0);

    if (seenLevel.current === null) {
      seenLevel.current = level;
      seenXpId.current = maxId;
      return;
    }

    const fresh = xpEvents.filter((e) => (e.id ?? 0) > (seenXpId.current ?? 0));
    if (fresh.length > 0) {
      seenXpId.current = maxId;
      // Card grades toast immediately; challenge XP is announced by its own overlay instead.
      const gained = fresh.filter((e) => e.reason === 'review' || e.reason === 'learn').reduce((s, e) => s + e.amount, 0);
      if (gained > 0) {
        const toastId = Date.now() + Math.random();
        setToasts((t) => [...t, { id: toastId, amount: gained }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toastId)), TOAST_MS);
      }
    }

    if (level > seenLevel.current) {
      seenLevel.current = level;
      setQueue((q) => [...q, { kind: 'level', level }]);
    } else {
      seenLevel.current = level;
    }
  }, [xpEvents]);

  useEffect(() => {
    if (!claims) return;
    if (seenClaimIds.current === null) {
      seenClaimIds.current = new Set(claims.map((c) => c.id!));
      return;
    }
    const fresh = claims.filter((c) => !seenClaimIds.current!.has(c.id!));
    if (fresh.length === 0) return;
    fresh.forEach((c) => seenClaimIds.current!.add(c.id!));

    const rewards: Reward[] = [];
    for (const claim of fresh) {
      const challenge = ALL_CHALLENGES.find((ch) => ch.key === claim.key);
      if (challenge) rewards.push({ kind: 'challenge', label: challenge.label, xp: challenge.xp, color: challenge.color });
    }
    if (rewards.length > 0) setQueue((q) => [...q, ...rewards]);
  }, [claims]);

  const active = queue[0];

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), REWARD_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <>
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(12px + env(safe-area-inset-top))',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            zIndex: 90,
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="xp-toast tabular-nums"
              style={{
                background: '#ffc800',
                color: '#3d2c00',
                fontFamily: 'Baloo 2',
                fontWeight: 800,
                fontSize: 15,
                padding: '6px 16px',
                borderRadius: 999,
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.22)',
              }}
            >
              +{t.amount} XP
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="reward-overlay" role="status" aria-live="polite">
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(2px)' }} />
          <div className="reward-content">
            <svg className="reward-rays" viewBox="0 0 100 100" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d="M50 50 L46 0 L54 0 Z"
                  fill={active.kind === 'level' ? '#ffc800' : active.color}
                  opacity={0.28}
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}
            </svg>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 24 }}>
              <div style={{ position: 'relative', fontSize: 76, lineHeight: 1 }}>
                {active.kind === 'level' ? '⭐' : '🏆'}
                <ParticleBurst
                  colors={active.kind === 'level' ? ['#ffc800', '#ffe08a', 'var(--primary)'] : [active.color, '#ffc800', '#ffffff']}
                  mode="burst"
                  count={26}
                  scale={1.5}
                />
              </div>

              {active.kind === 'level' ? (
                <>
                  <div style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 30, color: 'white' }}>Niveau {active.level} !</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Continue comme ça</div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 26, color: 'white' }}>Défi terminé !</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', maxWidth: 280 }}>{active.label}</div>
                  <div
                    className="tabular-nums"
                    style={{
                      background: '#ffc800',
                      color: '#3d2c00',
                      fontFamily: 'Baloo 2',
                      fontWeight: 800,
                      fontSize: 17,
                      padding: '5px 18px',
                      borderRadius: 999,
                      marginTop: 4,
                    }}
                  >
                    +{active.xp} XP
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
