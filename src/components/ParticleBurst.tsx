import { useMemo } from 'react';
import { cssVars } from '../utils/style';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

type Mode = 'burst' | 'fall';

export default function ParticleBurst({
  color,
  colors,
  mode = 'burst',
  count = 18,
  scale = 1,
}: {
  /** Single-color pieces. Ignored when `colors` is given. */
  color?: string;
  /** Cycles pieces through this palette instead of one flat color. */
  colors?: string[];
  mode?: Mode;
  count?: number;
  /** Multiplier on piece size and travel distance — bump for a bigger, more energetic effect. */
  scale?: number;
}) {
  const palette = colors && colors.length > 0 ? colors : [color ?? 'currentColor'];
  const reduceMotion = usePrefersReducedMotion();

  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const delay = Math.random() * 70;
      const duration = mode === 'burst' ? 650 + Math.random() * 300 : 550 + Math.random() * 260;
      const size = (7 + Math.random() * 5) * scale;
      const pieceColor = palette[i % palette.length];
      if (mode === 'burst') {
        const angle = Math.random() * 360;
        const distance = (60 + Math.random() * 90) * scale;
        const dx = Math.cos((angle * Math.PI) / 180) * distance;
        const dy = Math.sin((angle * Math.PI) / 180) * distance - 30 * scale;
        const rotate = Math.random() * 540 - 270;
        return { id: i, dx, dy, rotate, delay, duration, size, color: pieceColor };
      }
      const dx = (Math.random() - 0.5) * 90 * scale;
      const dy = (55 + Math.random() * 55) * scale;
      const rotate = Math.random() * 220 - 110;
      return { id: i, dx, dy, rotate, delay, duration, size, color: pieceColor };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [count, mode, scale, palette.join('|')]);

  // Purely decorative celebration flourish — skip the burst entirely rather than tame it,
  // since no information rides on the flying pieces themselves.
  if (reduceMotion) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: p.size,
            height: p.size * 1.7,
            background: p.color,
            borderRadius: 2,
            animation: `confetti-burst ${p.duration}ms ease-out ${p.delay}ms both`,
            ...cssVars({ '--confetti-dx': `${p.dx}px`, '--confetti-dy': `${p.dy}px`, '--confetti-rot': `${p.rotate}deg` }),
          }}
        />
      ))}
    </div>
  );
}
