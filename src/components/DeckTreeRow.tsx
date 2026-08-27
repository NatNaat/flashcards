import { useState } from 'react';
import type { Deck } from '../db/db';
import type { DeckStats } from '../utils/deckStats';
import DeckBadge from './DeckBadge';
import ProgressBar from './ProgressBar';
import { ChevronIcon } from './Icon';

export default function DeckTreeRow({
  deck,
  depth,
  childrenMap,
  stats,
  onNavigate,
  animationDelay,
}: {
  deck: Deck;
  depth: number;
  childrenMap: Record<number, Deck[]>;
  stats: Record<number, DeckStats>;
  onNavigate: (deckId: number) => void;
  animationDelay?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = childrenMap[deck.id!] ?? [];
  const hasChildren = children.length > 0;
  const s = stats[deck.id!];
  const due = s?.due ?? 0;
  const masteryValue = s && s.total > 0 ? s.mastered / s.total : null;

  return (
    <div>
      <div
        className="card-surface card-enter"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 14,
          paddingLeft: 14 + depth * 18,
          animationDelay: animationDelay !== undefined ? `${animationDelay}ms` : undefined,
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate(deck.id!)}
          style={{ display: 'flex', alignItems: 'center', gap: depth === 0 ? 14 : 12, flex: 1, minWidth: 0, textAlign: 'left', padding: 0 }}
        >
          <DeckBadge color={deck.color} icon={deck.icon} size={depth === 0 ? 44 : 34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: depth === 0 ? 16 : 14 }}>{deck.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{due > 0 ? `${due} carte${due > 1 ? 's' : ''} à réviser` : 'Tout est à jour'}</div>
            {masteryValue !== null && (
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={masteryValue} color="var(--primary)" height={6} />
              </div>
            )}
          </div>
        </button>
        {due > 0 && (
          <div
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {due}
          </div>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Réduire les sous-decks' : 'Voir les sous-decks'}
            aria-expanded={expanded}
            className="icon-btn"
            style={{
              color: 'var(--text-dim)',
              width: 32,
              height: 32,
              flexShrink: 0,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            <ChevronIcon size={16} />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {children.map((child) => (
            <DeckTreeRow key={child.id} deck={child} depth={depth + 1} childrenMap={childrenMap} stats={stats} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
