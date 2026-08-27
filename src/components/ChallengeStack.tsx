import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChallengePeriod, ChallengeState } from '../gamification/challenges';
import ChallengeList from './ChallengeList';

const SWIPE_THRESHOLD = 55;
const EXIT_DISTANCE = 120;
const PEEK = 10;
const BACK_SCALE = 0.96;
const TRANSITION_MS = 240;
const TRANSITION = `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${TRANSITION_MS}ms ease`;

const LABELS: Record<ChallengePeriod, string> = {
  daily: 'Défis du jour',
  weekly: 'Défis de la semaine',
};
const PERIODS = ['daily', 'weekly'] as const;

/**
 * Shows the daily and weekly challenge lists as a physical stack of two real cards, so a swipe
 * plays as one coordinated motion — the front card flies off while the one behind grows out of
 * its peek and settles into place — rather than the front card's content just being swapped.
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
  const [busy, setBusy] = useState(false);
  const [suppressTransition, setSuppressTransition] = useState(false);
  const dragStart = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frames = useRef<ReturnType<typeof requestAnimationFrame>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      frames.current.forEach(cancelAnimationFrame);
    },
    [],
  );

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
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
    setBusy(true);
    setOffset(dir * EXIT_DISTANCE);
    timers.current.push(
      setTimeout(() => {
        // The exited card is about to silently become the new peeking one — reposition it
        // instantly, while invisible, instead of animating the jump.
        setSuppressTransition(true);
        setActive((a) => (a === 'daily' ? 'weekly' : 'daily'));
        setOffset(0);
        frames.current.push(
          requestAnimationFrame(() => {
            frames.current.push(
              requestAnimationFrame(() => {
                setSuppressTransition(false);
                setBusy(false);
              }),
            );
          }),
        );
      }, TRANSITION_MS),
    );
  }

  const progress = Math.min(1, Math.abs(offset) / EXIT_DISTANCE);
  const transition = dragging || suppressTransition ? 'none' : TRANSITION;

  function frontStyle(): CSSProperties {
    return {
      gridArea: '1 / 1',
      zIndex: 2,
      padding: 18,
      touchAction: 'none',
      transform: `translateY(${offset}px)`,
      opacity: 1 - progress,
      transition,
    };
  }

  function backStyle(): CSSProperties {
    // Scaled via `transform`, never resized via box edges: the back card must keep the exact
    // same layout width as the front one, or its challenge labels wrap differently and visibly
    // reflow the instant it becomes front.
    const scale = BACK_SCALE + (1 - BACK_SCALE) * progress;
    const translateY = PEEK * (1 - progress);
    return {
      gridArea: '1 / 1',
      zIndex: 1,
      padding: 18,
      pointerEvents: 'none',
      transform: `translateY(${translateY}px) scale(${scale})`,
      opacity: 0.55 + progress * 0.45,
      transition,
    };
  }

  return (
    // A grid with both cards sharing one cell — rather than one card in flow (defining the
    // height) and the other absolutely positioned to match it — because the two periods' labels
    // can wrap to different line counts, so the shorter card must still size to fit the taller.
    <div className="card-enter" style={{ display: 'grid', marginBottom: 26, animationDelay }}>
      {PERIODS.map((period) => {
        const isFront = period === active;
        return (
          <div
            key={period}
            className="card-surface"
            style={isFront ? frontStyle() : backStyle()}
            onPointerDown={isFront ? onPointerDown : undefined}
            onPointerMove={isFront ? onPointerMove : undefined}
            onPointerUp={isFront ? onPointerUp : undefined}
            onPointerCancel={isFront ? onPointerUp : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{LABELS[period]}</div>
              <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
                {PERIODS.map((p) => (
                  <span
                    key={p}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: p === period ? 'var(--primary)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>
            </div>
            <ChallengeList states={period === 'daily' ? dailyStates : weeklyStates} />
          </div>
        );
      })}
    </div>
  );
}
