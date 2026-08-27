import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChallengePeriod, ChallengeState } from '../gamification/challenges';
import ChallengeList from './ChallengeList';
import { ChevronIcon } from './Icon';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const SWIPE_THRESHOLD = 55;
const EXIT_DISTANCE = 120;
const PEEK = 10;
const BACK_SCALE = 0.96;
const TRANSITION_MS = 240;
// How far past the resting frame a card's own drop shadow is allowed to bleed before the
// wrapper clips it — generous enough to keep the shadow's visible weight, tight enough that a
// dragged-away card actually disappears at the edge instead of floating past it mid-swipe.
const CLIP_PAD = 16;

const LABELS: Record<ChallengePeriod, string> = {
  daily: 'Défis du jour',
  weekly: 'Défis de la semaine',
};
const SWITCH_LABEL: Record<ChallengePeriod, string> = {
  daily: 'Voir les défis de la semaine',
  weekly: 'Voir les défis du jour',
};
const PERIODS = ['daily', 'weekly'] as const;

/**
 * Shows the daily and weekly challenge lists as a physical stack of two real cards. A vertical
 * swipe drags the active card away while the other one grows out of its peek behind it, and
 * partway through that single motion (once the growing card is more prominent than the one
 * leaving) draw order flips so it visibly overtakes — rather than the two only swapping places
 * in a discrete step once the gesture ends. The same motion is also reachable by tapping the
 * dots — the swipe has no other affordance, so it can't be the only way in.
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
  const reduceMotion = usePrefersReducedMotion();
  // A click-triggered flip is a triggered animation (not the finger directly tracking a drag),
  // so it's the one this component shortens to a snap under prefers-reduced-motion.
  const transitionMs = reduceMotion ? 0 : TRANSITION_MS;

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      frames.current.forEach(cancelAnimationFrame);
    },
    [],
  );

  function flipTo(dir: 1 | -1) {
    if (busy) return;
    setBusy(true);
    setOffset(dir * EXIT_DISTANCE);
    timers.current.push(
      setTimeout(() => {
        // The exited card is about to silently become the new peeking one — reposition it
        // instantly, while invisible behind the new front card, instead of animating the jump.
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
      }, transitionMs),
    );
  }

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
    flipTo(offset < 0 ? -1 : 1);
  }

  const progress = Math.min(1, Math.abs(offset) / EXIT_DISTANCE);
  const transition = dragging || suppressTransition || reduceMotion ? 'none' : `transform ${TRANSITION_MS}ms var(--ease-out)`;
  // The growing card only reads as "in front" once it's more than halfway grown — draw order
  // flips there, mid-motion, instead of only at the very end of the gesture.
  const otherOnTop = progress > 0.5;

  function activeStyle(): CSSProperties {
    return {
      gridArea: '1 / 1',
      zIndex: otherOnTop ? 1 : 2,
      padding: 18,
      touchAction: 'none',
      transform: `translateY(${offset}px)`,
      transition,
    };
  }

  function otherStyle(): CSSProperties {
    // Scaled via `transform`, never resized via box edges: this card must keep the exact same
    // layout width as the active one, or its challenge labels wrap differently and visibly
    // reflow the instant it becomes active.
    const scale = BACK_SCALE + (1 - BACK_SCALE) * progress;
    const translateY = PEEK * (1 - progress);
    return {
      gridArea: '1 / 1',
      zIndex: otherOnTop ? 2 : 1,
      padding: 18,
      pointerEvents: 'none',
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition,
    };
  }

  return (
    <div className="card-enter" style={{ animationDelay, marginBottom: 26 - CLIP_PAD }}>
      {/* Clips a card once it's dragged past the resting frame, instead of letting it float
          outside the stack mid-swipe. The padding keeps the peeking card's intentional overhang
          and each card's own drop shadow visible instead of clipping them flush. */}
      <div style={{ overflow: 'hidden', margin: -CLIP_PAD, padding: CLIP_PAD, paddingBottom: CLIP_PAD + PEEK }}>
        {/* A grid with both cards sharing one cell — rather than one card in flow (defining the
            height) and the other absolutely positioned to match it — because the two periods'
            labels can wrap to different line counts, so the shorter card must still size to fit
            the taller. */}
        <div style={{ display: 'grid' }}>
          {PERIODS.map((period) => {
            const isActive = period === active;
            return (
              <div
                key={period}
                className="card-surface"
                style={isActive ? activeStyle() : otherStyle()}
                onPointerDown={isActive ? onPointerDown : undefined}
                onPointerMove={isActive ? onPointerMove : undefined}
                onPointerUp={isActive ? onPointerUp : undefined}
                onPointerCancel={isActive ? onPointerUp : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600 }}>{LABELS[period]}</div>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => flipTo(period === 'daily' ? -1 : 1)}
                      aria-label={SWITCH_LABEL[period]}
                      // Visually a small dots+chevron affordance, but padded out to a real
                      // 44x44 touch target via negative margins so it doesn't inflate the row.
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        minWidth: 44,
                        minHeight: 44,
                        margin: '-16px -12px -16px 0',
                        padding: '0 12px',
                        color: 'var(--text-dim)',
                      }}
                    >
                      <span style={{ display: 'flex', gap: 5 }} aria-hidden="true">
                        {PERIODS.map((p) => (
                          <span
                            key={p}
                            style={{ width: 6, height: 6, borderRadius: 999, background: p === period ? 'var(--primary)' : 'var(--border)' }}
                          />
                        ))}
                      </span>
                      <span style={{ display: 'flex', transform: 'rotate(90deg)' }} aria-hidden="true">
                        <ChevronIcon size={11} />
                      </span>
                    </button>
                  ) : (
                    <span style={{ display: 'flex', gap: 5 }} aria-hidden="true">
                      {PERIODS.map((p) => (
                        <span
                          key={p}
                          style={{ width: 6, height: 6, borderRadius: 999, background: p === period ? 'var(--primary)' : 'var(--border)' }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <ChallengeList states={period === 'daily' ? dailyStates : weeklyStates} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
