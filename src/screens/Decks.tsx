import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { createDeck } from '../db/decks';
import NewDeckForm from '../components/NewDeckForm';
import DeckTreeRow from '../components/DeckTreeRow';
import AddActionMenu from '../components/AddActionMenu';
import ImportCardsPanel from '../components/ImportCardsPanel';
import Mascot from '../components/Mascot';
import { AddDeckIcon, PlusIcon, UploadIcon } from '../components/Icon';
import { cssVars } from '../utils/style';
import { buildChildrenMap, computeDeckStats } from '../utils/deckStats';

export default function Decks() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<'none' | 'menu' | 'new' | 'import'>('none');

  const decks = useLiveQuery(() => db.decks.toArray(), []);
  const allCards = useLiveQuery(() => db.cards.toArray(), []);

  const rootDecks = useMemo(
    () => (decks ?? []).filter((d) => d.parentId === 0).sort((a, b) => a.createdAt - b.createdAt),
    [decks]
  );

  const childrenMap = useMemo(() => buildChildrenMap(decks ?? []), [decks]);

  const deckStats = useMemo(() => {
    if (!decks || !allCards) return {};
    return computeDeckStats(decks, allCards, childrenMap);
  }, [decks, allCards, childrenMap]);

  return (
    <div className="screen screen-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28 }}>Mes decks</h1>
        <button
          className="btn-pill icon-btn"
          aria-label="Ajouter"
          style={{ background: 'var(--primary)', color: 'var(--on-primary)', width: 44, height: 44, ...cssVars({ '--btn-shadow': 'var(--primary-dark)' }) }}
          onClick={() => setActivePanel((p) => (p === 'menu' ? 'none' : 'menu'))}
        >
          <PlusIcon size={20} />
        </button>
      </div>

      {activePanel === 'menu' && (
        <AddActionMenu
          actions={[
            { key: 'new', label: 'Créer un deck', Icon: AddDeckIcon, onClick: () => setActivePanel('new') },
            { key: 'import', label: 'Importer des cartes', Icon: UploadIcon, onClick: () => setActivePanel('import') },
          ]}
        />
      )}

      {activePanel === 'new' && (
        <NewDeckForm onCreate={(name, color, icon) => createDeck(name, { color, icon })} onDone={() => setActivePanel('none')} />
      )}

      {activePanel === 'import' && <ImportCardsPanel onDone={() => setActivePanel('none')} />}

      {rootDecks.length === 0 && activePanel === 'none' && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 24 }}>
          <Mascot name="studying" size={210} marginTop={0} />
          <p style={{ marginTop: 16 }}>
            Aucun deck pour l'instant.
            <br />
            Crée ton premier deck pour commencer.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rootDecks.map((deck, i) => (
          <DeckTreeRow
            key={deck.id}
            deck={deck}
            depth={0}
            childrenMap={childrenMap}
            stats={deckStats}
            onNavigate={(deckId) => navigate(`/deck/${deckId}`)}
            animationDelay={i * 40}
          />
        ))}
      </div>

      {rootDecks.length > 0 && <Mascot name="books" size={190} marginTop={36} />}
    </div>
  );
}
