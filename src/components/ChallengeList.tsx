import type { ChallengeState } from '../gamification/challenges';
import ProgressBar from './ProgressBar';
import { CheckIcon } from './Icon';

export default function ChallengeList({ states }: { states: ChallengeState[] }) {
  return (
    <>
      {states.map(({ challenge, progress, claimed }) => (
        <div key={challenge.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: claimed ? challenge.color : 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {claimed && (
              <span style={{ color: 'white', display: 'flex' }}>
                <CheckIcon size={13} />
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: claimed ? 'var(--text-dim)' : 'var(--text)' }}>
                {challenge.label}
              </span>
              <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: '#c79500', flexShrink: 0 }}>
                +{challenge.xp}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={progress / challenge.target} color={challenge.color} height={8} />
            </div>
          </div>
          <div className="tabular-nums" style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>
            {progress}/{challenge.target}
          </div>
        </div>
      ))}
    </>
  );
}
