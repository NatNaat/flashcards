import { CloseIcon } from './Icon';

export default function StreakBreakNotice({ days, onDismiss }: { days: number; onDismiss: () => void }) {
  return (
    <div className="card-surface card-enter" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 16 }}>
      <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">
        🕯️
      </span>
      <div style={{ flex: 1, fontSize: 14 }}>
        Ta série de {days} jour{days > 1 ? 's' : ''} s'est arrêtée. Pas grave, on repart aujourd'hui !
      </div>
      <button onClick={onDismiss} aria-label="Fermer" className="icon-btn" style={{ color: 'var(--text-dim)', width: 32, height: 32, flexShrink: 0 }}>
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
