import { DECK_SVG_ICONS, DECK_EMOJI } from './deckIcons';
import { DECK_PALETTE } from '../db/decks';
import { CloseIcon } from './Icon';

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-dim)',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function pickerButtonStyle(selected: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: selected ? 'var(--surface-2)' : 'none',
    outline: selected ? '2px solid var(--primary-fg)' : 'none',
    outlineOffset: 2,
  };
}

export default function DeckBadgePicker({
  color,
  icon,
  onChange,
}: {
  color: string;
  icon?: string;
  onChange: (color: string, icon?: string) => void;
}) {
  return (
    <div className="card-surface card-enter" style={{ padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={sectionLabel}>Couleur</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {DECK_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c, icon)}
              aria-label={`Couleur ${c}`}
              style={{ width: 36, height: 36, borderRadius: 999, background: c, outline: c === color ? '2px solid var(--text)' : 'none', outlineOffset: 2 }}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Icône</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => onChange(color, undefined)}
            aria-label="Aucune icône"
            className="icon-btn"
            style={pickerButtonStyle(!icon)}
          >
            <CloseIcon size={14} />
          </button>
          {Object.entries(DECK_SVG_ICONS).map(([key, { Icon, label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(color, `svg:${key}`)}
              aria-label={label}
              className="icon-btn"
              style={pickerButtonStyle(icon === `svg:${key}`)}
            >
              <Icon size={18} weight="bold" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Emoji</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {DECK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange(color, `emoji:${e}`)}
              aria-label={e}
              className="icon-btn"
              style={{ ...pickerButtonStyle(icon === `emoji:${e}`), fontSize: 18 }}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={icon?.startsWith('emoji:') ? icon.slice(6) : ''}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(color, v ? `emoji:${v}` : undefined);
          }}
          placeholder="Ou tape n'importe quel emoji…"
          style={{
            width: '100%',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            color: 'var(--text)',
            fontSize: 15,
          }}
        />
      </div>
    </div>
  );
}
