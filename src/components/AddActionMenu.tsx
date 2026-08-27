import type { FC } from 'react';

export type AddAction = { key: string; label: string; Icon: FC<{ size?: number }>; onClick: () => void };

export default function AddActionMenu({ actions }: { actions: AddAction[] }) {
  return (
    <div className="card-surface card-enter" style={{ padding: 8, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={action.onClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 14,
            textAlign: 'left',
            width: '100%',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <span style={{ color: 'var(--primary-fg)', display: 'flex' }}>
            <action.Icon size={20} />
          </span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
