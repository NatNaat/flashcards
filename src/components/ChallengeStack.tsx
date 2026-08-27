import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChallengePeriod, ChallengeState } from '../gamification/challenges';
import ChallengeList from './ChallengeList';
import { ChevronIcon } from './Icon';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const SWIPE_THRESHOLD = 55;
const EXIT_DISTANCE = 120;
const PEEK = 10;
const BACK_SCALE = 0.96;
const SNAP_BACK_MS = 220;
const TAP_MS = 260;
const MIN_RELEASE_MS = 140;
const MAX_RELEASE_MS = 320;
// How far past the resting frame a card's own drop shadow is allowed to bleed before the
// wrapper clips it — generous enough to keep the shadow's visible weight, tight enough that a
// dragged-away card actually disappears at the edge instead of floating past it mid-swipe.
const CLIP_PAD = 16;
// The z-order swap at progress 0.5 is a hard cut — content on one card is instantly replaced by
// the other's wherever they overlap. Dipping the departing card's opacity in a narrow band
// around that exact instant hides the seam without reading as the whole-gesture cross-fade this
// replaced; outside the band both cards stay fully opaque.
const SEAM_HALF = 0.16;
const SEAM_DIP = 0.55;

const LABELS: Record<ChallengePeriod, string> = {
  daily: 'Défis du jour',
  weekly: 'Défis de la semaine',
};
const SWITCH_LABEL: Record<ChallengePeriod, string> = {
  daily: 'Voir les défis de la semaine',
  weekly: 'Voir les défis du jour',
};
const PERIODS = ['daily', 'weekly'] as const;

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Shows the daily and weekly challenge lists as a physical stack of two real cards. A vertical
 * swipe drags the active card away while the other one grows out of its peek behind it, and
 * partway through that single motion (once the growing card is more prominent than the one
 * leaving) draw order flips so it visibly overtakes. The same motion is also reachable by
 * tapping the dots — the swipe has no other affordance, so it can't be the only way in.
 *
 * The whole gesture — manual drag, its release, and a tap-triggered flip — is driven by one
 * `offset` value that's either set directly from the pointer or eased via requestAnimationFrame,
 * never by a CSS transition. That keeps every derived property (z-order, scale, the seam dip
 * below) correctly in sync frame-by-frame in all three cases, and lets release carry the drag's
 * own velocity instead of always animating at the same fixed duration.
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
  const [busy, setBusy] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  const dragStart = useRef<number | null>(null);
  const lastMove = useRef<{ t: number; offset: number } | null>(null);
  const prevMove = useRef<{ t: number; offset: number } | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  function stopAnimation() {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }

  function animateOffset(from: number, to: number, durationMs: number, onDone?: () => void) {
    stopAnimation();
    if (reduceMotion || durationMs <= 0) {
      setOffset(to);
      onDone?.();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setOffset(from + (to - from) * easeOutExpo(t));
      if (t < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        rafId.current = null;
        onDone?.();
      }
    };
    rafId.current = requestAnimationFrame(tick);
  }

  function flipTo(dir: 1 | -1, fromOffset = 0, durationMs = TAP_MS) {
    if (busy) return;
    setBusy(true);
    animateOffset(fromOffset, dir * EXIT_DISTANCE, durationMs, () => {
      // The exited card is about to silently become the new peeking one. Both are driven by
      // this same `offset`, so resetting it to 0 in the same tick `active` flips just means the
      // new front card (already fully grown at offset 0) doesn't move, and the new back card
      // (now invisible at full exit) reappears at its resting peek — nothing to animate either
      // way, so no jump to hide.
      setActive((a) => (a === 'daily' ? 'weekly' : 'daily'));
      setOffset(0);
      setBusy(false);
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
    stopAnimation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
    const sample = { t: performance.now(), offset };
    lastMove.current = sample;
    prevMove.current = sample;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    const newOffset = e.clientY - dragStart.current;
    setOffset(newOffset);
    prevMove.current = lastMove.current;
    lastMove.current = { t: performance.now(), offset: newOffset };
  }

  function onPointerUp() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    const released = lastMove.current?.offset ?? offset;

    if (Math.abs(released) < SWIPE_THRESHOLD) {
      setBusy(true);
      animateOffset(released, 0, SNAP_BACK_MS, () => setBusy(false));
      return;
    }

    const dir = released < 0 ? -1 : 1;
    // Instantaneous velocity from the last two samples (px/ms) — a fast flick finishes the
    // remaining distance quickly, a slow deliberate release settles more gently, instead of
    // every release taking the same fixed time regardless of how it was thrown.
    let velocity = 0;
    if (lastMove.current && prevMove.current) {
      const dt = Math.max(4, lastMove.current.t - prevMove.current.t);
      velocity = Math.abs(lastMove.current.offset - prevMove.current.offset) / dt;
    }
    const duration = Math.max(MIN_RELEASE_MS, Math.min(MAX_RELEASE_MS, 300 / (1 + velocity * 3)));
    flipTo(dir, released, duration);
  }

  const progress = Math.min(1, Math.abs(offset) / EXIT_DISTANCE);
  // The growing card only reads as "in front" once it's more than halfway grown — draw order
  // flips there, mid-motion, instead of only at the very end of the gesture.
  const otherOnTop = progress > 0.5;
  const seamDistance = Math.abs(progress - 0.5);
  const seamDip = seamDistance < SEAM_HALF ? (1 - seamDistance / SEAM_HALF) * SEAM_DIP : 0;

  function activeStyle(): CSSProperties {
    return {
      gridArea: '1 / 1',
      zIndex: otherOnTop ? 1 : 2,
      padding: 18,
      touchAction: 'none',
      transform: `translateY(${offset}px)`,
      opacity: 1 - seamDip,
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
                      // Without this, a tap here still bubbles to the card's own onPointerDown
                      // below, which captures the pointer for dragging — that capture swallows
                      // the native click synthesis, so the button silently never fires at all.
                      onPointerDown={(e) => e.stopPropagation()}
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
