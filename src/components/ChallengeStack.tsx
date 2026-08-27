import { useEffect, useRef, useState } from 'react';
import type { ChallengePeriod, ChallengeState } from '../gamification/challenges';
import ChallengeList from './ChallengeList';

const SWIPE_THRESHOLD = 55;
const EXIT_DISTANCE = 120;
const TRANSITION_MS = 240;
const TRANSITION = `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${TRANSITION_MS}ms ease`;

type Phase = 'idle' | 'exiting' | 'entering';

const LABELS: Record<ChallengePeriod, string> = {
  daily: 'Défis du jour',
  weekly: 'Défis de la semaine',
};

/**
 * Shows the daily and weekly challenge lists as a physical stack of two cards: the second
 * peeks out from behind so it's clear there's more, and a vertical swipe (either direction,
 * since there are only two) flips between them.
 *
 * Phase transitions run on a fixed timer rather than the DOM `transitionend` event: that event
 * doesn't fire when the target offset happens to match the current one (e.g. a drag that already
 * reached EXIT_DISTANCE before release), which would otherwise strand the card mid-swipe.
 */
export default function ChallengeStack({
  dailyStates,
  weeklyStates,
  animationDelay,
}: {
  dailyStates: ChallengeState[];
  weeklyStates: ChallengeState[];
  animationDelay?: string;
}) {
  const [active, setActive] = useState<ChallengePeriod>('daily');
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const dragStart = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function onPointerDown(e: React.PointerEvent) {
    if (phase !== 'idle') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    setOffset(e.clientY - dragStart.current);
  }

  function onPointerUp() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragging(false);
    if (Math.abs(offset) < SWIPE_THRESHOLD) {
      setOffset(0);
      return;
    }
    const dir = offset < 0 ? -1 : 1;
    setPhase('exiting');
    setOffset(dir * EXIT_DISTANCE);
    timers.current.push(
      setTimeout(() => {
        setActive((a) => (a === 'daily' ? 'weekly' : 'daily'));
        setPhase('entering');
        setOffset(0);
        timers.current.push(setTimeout(() => setPhase('idle'), TRANSITION_MS));
      }, TRANSITION_MS),
    );
  }

  const states = active === 'daily' ? dailyStates : weeklyStates;
  const opacity = 1 - Math.min(1, Math.abs(offset) / EXIT_DISTANCE) * 0.85;

  return (
    <div className="card-enter" style={{ position: 'relative', marginBottom: 26, animationDelay }}>
      <div
        aria-hidden="true"
        className="card-surface"
        style={{ position: 'absolute', inset: '10px 10px -10px 10px', opacity: 0.55, transform: 'scale(0.96)' }}
      />
      <div
        className="card-surface"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: 18,
          touchAction: 'none',
          transform: `translateY(${offset}px)`,
          opacity,
          transition: dragging ? 'none' : TRANSITION,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>{LABELS[active]}</div>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
            {(['daily', 'weekly'] as const).map((period) => (
              <span
                key={period}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: period === active ? 'var(--primary)' : 'var(--border)',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>
        <ChallengeList states={states} />
      </div>
    </div>
  );
}
