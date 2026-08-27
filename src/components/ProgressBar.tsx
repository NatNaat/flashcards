import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * Duolingo-style progress bar: a rounded track, a solid rounded fill, and a bright
 * highlight sliver floating in the fill's upper half (inset from both ends so it reads
 * as a glossy cap rather than a second bar).
 */
export default function ProgressBar({
  value,
  color,
  height = 16,
  ariaLabel,
  animate = true,
  trackColor = 'var(--surface-2)',
  highlight = 'rgba(255, 255, 255, 0.45)',
}: {
  value: number;
  color: string;
  height?: number;
  ariaLabel?: string;
  animate?: boolean;
  trackColor?: string;
  /** Set to 'none' when the fill is already near-white and a highlight would be invisible. */
  highlight?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const showHighlight = highlight !== 'none' && clamped > 0.04;
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div
      role={ariaLabel ? 'progressbar' : undefined}
      aria-label={ariaLabel}
      aria-valuenow={ariaLabel ? Math.round(clamped * 100) : undefined}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
      style={{ height, background: trackColor, borderRadius: 999, overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          // Animated via `width` rather than `transform: scaleX` on purpose: scaling the fill
          // would non-uniformly squash the highlight sliver nested inside it.
          width: `${clamped * 100}%`,
          minWidth: clamped > 0 ? height : 0,
          background: color,
          borderRadius: 999,
          transition: animate && !reduceMotion ? 'width 0.4s var(--ease-out)' : 'none',
        }}
      >
        {showHighlight && (
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: height * 0.34,
              right: height * 0.34,
              height: '26%',
              background: highlight,
              borderRadius: 999,
            }}
          />
        )}
      </div>
    </div>
  );
}
