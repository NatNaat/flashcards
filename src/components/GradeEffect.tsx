import { Rating, type Grade } from '../scheduler/scheduler';
import { gradeMeta } from '../scheduler/gradeMeta';
import ParticleBurst from './ParticleBurst';
import { CheckIcon } from './Icon';

/**
 * Four deliberately distinct feedback effects, one per grade — not just the same burst recolored:
 * Easy gets the big multi-color celebration, Good a confident check badge, Hard heavier/slower
 * falling pieces, Again a light scatter (paired with a card shake driven by the caller).
 */
export default function GradeEffect({ grade }: { grade: Grade }) {
  const color = gradeMeta(grade).color;

  if (grade === Rating.Easy) {
    const palette = [color, 'var(--primary)', gradeMeta(Rating.Good).color, '#fd79a8', '#a29bfe'];
    return <ParticleBurst colors={palette} mode="burst" count={28} scale={1.3} />;
  }

  if (grade === Rating.Good) {
    return (
      <>
        <ParticleBurst color={color} mode="burst" count={10} scale={0.7} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div
            className="check-pop"
            style={{
              width: 60,
              height: 60,
              borderRadius: 999,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <span style={{ color: 'white', display: 'flex' }}>
              <CheckIcon size={30} />
            </span>
          </div>
        </div>
      </>
    );
  }

  if (grade === Rating.Hard) {
    return <ParticleBurst color={color} mode="fall" count={9} scale={1.4} />;
  }

  return <ParticleBurst color={color} mode="fall" count={10} scale={0.85} />;
}
