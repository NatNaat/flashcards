import { useState } from 'react';
import { DECK_PALETTE } from '../db/decks';
import DeckBadge from './DeckBadge';
import DeckBadgePicker from './DeckBadgePicker';
import AnimatedPanel from './AnimatedPanel';

export default function NewDeckForm({
  placeholder = 'Nom du deck',
  initialColor,
  onCreate,
  onDone,
}: {
  placeholder?: string;
  initialColor?: string;
  onCreate: (name: string, color: string, icon: string | undefined) => Promise<unknown>;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => initialColor ?? DECK_PALETTE[Math.floor(Math.random() * DECK_PALETTE.length)]);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed, color, icon);
    setName('');
    onDone();
  }

  return (
    <div className="card-surface card-enter" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => setShowPicker((v) => !v)} aria-label="Personnaliser l'icône" style={{ padding: 0 }}>
          <DeckBadge color={color} icon={icon} size={40} />
        </button>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            color: 'var(--text)',
            // iOS force-zooms the viewport when a focused input's font is under 16px.
            fontSize: 16,
          }}
        />
        <button className="btn-pill btn-primary" style={{ padding: '10px 16px' }} onClick={submit}>
          Créer
        </button>
      </div>

      <AnimatedPanel open={showPicker}>
        <DeckBadgePicker
          color={color}
          icon={icon}
          onChange={(c, i) => {
            setColor(c);
            setIcon(i);
          }}
        />
      </AnimatedPanel>
    </div>
  );
}
