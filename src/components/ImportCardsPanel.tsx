import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { createDeck } from '../db/decks';
import { addCard } from '../db/cards';
import { parseCsv, isHeaderRow } from '../utils/csv';
import { buildDeckTree } from '../utils/deckTree';
import DeckBadge from './DeckBadge';
import { PlusIcon } from './Icon';

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-dim)',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 15,
};

export default function ImportCardsPanel({
  defaultDeckId,
  onDone,
}: {
  defaultDeckId?: string;
  onDone: () => void;
}) {
  const allDecks = useLiveQuery(() => db.decks.toArray(), []);
  const tree = useMemo(() => buildDeckTree(allDecks ?? []), [allDecks]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(defaultDeckId ?? null);
  const [newDeckName, setNewDeckName] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const canPickFile = (mode === 'existing' && selectedDeckId !== null) || (mode === 'new' && newDeckName.trim().length > 0);

  async function handleFile(file: File) {
    let deckId = selectedDeckId;
    let deckName = allDecks?.find((d) => d.id === selectedDeckId)?.name ?? '';
    if (mode === 'new') {
      const name = newDeckName.trim();
      if (!name) return;
      deckId = await createDeck(name);
      deckName = name;
    }
    if (!deckId) return;

    const text = await file.text();
    const rows = parseCsv(text);
    const dataRows = rows.length && isHeaderRow(rows[0]) ? rows.slice(1) : rows;
    let imported = 0;
    for (const row of dataRows) {
      const [rowFront, rowBack, rowTags] = row;
      if (!rowFront?.trim() || !rowBack?.trim()) continue;
      const tags = rowTags ? rowTags.split(/\s+/).filter(Boolean) : undefined;
      await addCard(deckId, rowFront.trim(), rowBack.trim(), { tags });
      imported++;
    }
    setImportMessage(
      imported > 0
        ? `${imported} carte${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''} dans « ${deckName} ».`
        : "Aucune carte valide trouvée dans ce fichier."
    );
  }

  return (
    <div className="card-surface card-enter" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={sectionLabel}>Importer dans</div>
        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tree.map(({ deck, depth }) => {
            const selected = mode === 'existing' && selectedDeckId === deck.id;
            return (
              <button
                key={deck.id}
                type="button"
                onClick={() => {
                  setMode('existing');
                  setSelectedDeckId(deck.id!);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  paddingLeft: 10 + depth * 20,
                  borderRadius: 10,
                  background: selected ? 'var(--surface-2)' : 'none',
                  outline: selected ? '2px solid var(--primary-fg)' : 'none',
                  outlineOffset: -2,
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <DeckBadge color={deck.color} icon={deck.icon} size={26} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{deck.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMode('new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: mode === 'new' ? 'var(--surface-2)' : 'none',
              outline: mode === 'new' ? '2px solid var(--primary-fg)' : 'none',
              outlineOffset: -2,
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span
              className="icon-btn"
              style={{ width: 26, height: 26, background: 'var(--surface-2)', color: 'var(--text-dim)' }}
            >
              <PlusIcon size={14} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Nouveau deck</span>
          </button>
        </div>
      </div>

      {mode === 'new' && (
        <input
          autoFocus
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder="Nom du nouveau deck"
          style={inputStyle}
        />
      )}

      <button className="btn-pill btn-primary" disabled={!canPickFile} onClick={() => fileInputRef.current?.click()}>
        Choisir un fichier CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {importMessage && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{importMessage}</div>}

      <button type="button" className="btn-pill" style={{ background: 'var(--surface-2)', color: 'var(--text)' }} onClick={onDone}>
        Fermer
      </button>
    </div>
  );
}
