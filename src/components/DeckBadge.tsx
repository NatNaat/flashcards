import { DECK_SVG_ICONS, parseDeckIcon } from './deckIcons';
import { contrastingIconColor } from '../utils/color';

export default function DeckBadge({
  color,
  icon,
  size = 44,
}: {
  color: string;
  icon?: string;
  size?: number;
}) {
  const parsed = parseDeckIcon(icon);
  const iconColor = contrastingIconColor(color);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: color,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {parsed?.kind === 'emoji' && <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{parsed.value}</span>}
      {parsed?.kind === 'svg' &&
        DECK_SVG_ICONS[parsed.key] &&
        (() => {
          const { Icon } = DECK_SVG_ICONS[parsed.key];
          return (
            <span style={{ color: iconColor, display: 'flex' }}>
              <Icon size={size * 0.5} weight="bold" />
            </span>
          );
        })()}
    </div>
  );
}
