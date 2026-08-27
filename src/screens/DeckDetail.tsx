import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type CardRecord, type CardType } from '../db/db';
import { addCard, deleteCard, setCardSuspended, updateCard } from '../db/cards';
import { createDeck, deleteDeck, updateDeckAppearance } from '../db/decks';
import { AddCardIcon, AddDeckIcon, CloseIcon, PauseIcon, PlayIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon } from '../components/Icon';
import { deriveClozeBack, deriveClozeFront, hasCloze } from '../utils/cloze';
import { cssVars } from '../utils/style';
import { buildChildrenMap, computeDeckStats } from '../utils/deckStats';
import NewDeckForm from '../components/NewDeckForm';
import DeckBadge from '../components/DeckBadge';
import DeckBadgePicker from '../components/DeckBadgePicker';
import DeckTreeRow from '../components/DeckTreeRow';
import AnimatedPanel from '../components/AnimatedPanel';
import AddActionMenu from '../components/AddActionMenu';
import ImportCardsPanel from '../components/ImportCardsPanel';

type CardFormValues = { front: string; back: string; type: CardType; clozeText?: string; tags?: string[] };

// A confident, fast "Supprimer" tap after the confirm step still shouldn't be instantly final —
// the delete only actually runs once this grace period elapses, so "Annuler" genuinely undoes it.
const UNDO_MS = 5000;

function CardForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Partial<CardFormValues>;
  onSubmit: (values: CardFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [type, setType] = useState<CardType>(initial?.type ?? 'basic');
  const [front, setFront] = useState(initial?.front ?? '');
  const [back, setBack] = useState(initial?.back ?? '');
  const [clozeText, setClozeText] = useState(initial?.clozeText ?? '');
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(', '));

  function submit() {
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (type === 'cloze') {
      const trimmed = clozeText.trim();
      if (!hasCloze(trimmed)) return;
      onSubmit({
        front: deriveClozeFront(trimmed),
        back: deriveClozeBack(trimmed),
        type,
        clozeText: trimmed,
        tags: tags.length ? tags : undefined,
      });
    } else {
      if (!front.trim() || !back.trim()) return;
      onSubmit({ front: front.trim(), back: back.trim(), type, tags: tags.length ? tags : undefined });
    }
  }

  return (
    <div className="card-surface card-enter" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setType('basic')}
          className="btn-pill"
          style={{
            flex: 1,
            padding: '8px 14px',
            fontSize: 13,
            background: type === 'basic' ? 'var(--primary)' : 'var(--surface-2)',
            color: type === 'basic' ? 'var(--on-primary)' : 'var(--text)',
            ...(type === 'basic' ? cssVars({ '--btn-shadow': 'var(--primary-dark)' }) : {}),
          }}
        >
          Basique
        </button>
        <button
          type="button"
          onClick={() => setType('cloze')}
          className="btn-pill"
          style={{
            flex: 1,
            padding: '8px 14px',
            fontSize: 13,
            background: type === 'cloze' ? 'var(--primary)' : 'var(--surface-2)',
            color: type === 'cloze' ? 'var(--on-primary)' : 'var(--text)',
            ...(type === 'cloze' ? cssVars({ '--btn-shadow': 'var(--primary-dark)' }) : {}),
          }}
        >
          Texte à trous
        </button>
      </div>

      {type === 'basic' ? (
        <>
          <textarea autoFocus value={front} onChange={(e) => setFront(e.target.value)} placeholder="Recto (question)" rows={2} style={inputStyle} />
          <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Verso (réponse)" rows={2} style={inputStyle} />
        </>
      ) : (
        <>
          <textarea
            autoFocus
            value={clozeText}
            onChange={(e) => setClozeText(e.target.value)}
            placeholder="La capitale de la France est {{Paris}}."
            rows={3}
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Entoure la réponse avec des doubles accolades : {'{{...}}'}</div>
        </>
      )}

      <input
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        placeholder="Tags (séparés par une virgule)"
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-pill" style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text)' }} onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className="btn-pill btn-primary" style={{ flex: 1 }} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function DeckDetail() {
  const { deckId } = useParams();
  const id = deckId!;
  const navigate = useNavigate();

  const [activePanel, setActivePanel] = useState<'none' | 'menu' | 'add' | 'subdeck' | 'import'>('none');
  const [showBadgeEditor, setShowBadgeEditor] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [confirmDeckDelete, setConfirmDeckDelete] = useState(false);
  const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [pendingCardDeleteId, setPendingCardDeleteId] = useState<string | null>(null);
  const [deckDeletePending, setDeckDeletePending] = useState(false);
  const cardDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deck = useLiveQuery(() => db.decks.get(id), [id]);
  const allDecks = useLiveQuery(() => db.decks.toArray(), []);
  const allCards = useLiveQuery(() => db.cards.toArray(), []);
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(id).reverse().sortBy('createdAt'), [id]);

  const parentDeck = allDecks?.find((d) => d.id === deck?.parentId);

  const childrenMap = useMemo(() => buildChildrenMap(allDecks ?? []), [allDecks]);

  const childDecks = useMemo(() => childrenMap[id] ?? [], [childrenMap, id]);

  const deckStats = useMemo(() => {
    if (!allDecks || !allCards) return {};
    return computeDeckStats(allDecks, allCards, childrenMap);
  }, [allDecks, allCards, childrenMap]);

  const ownStats = deckStats[id];
  const dueCount = ownStats?.due ?? 0;
  const learnCount = ownStats?.learn ?? 0;
  const subtreeCardCount = ownStats?.total ?? 0;
  const subdeckCount = ownStats?.subdeckCount ?? 0;
  // A deck with nothing in it yet can't be reviewed or learned from — showing those two
  // actions disabled makes them the loudest thing on screen while pointing nowhere.
  const isEmptyDeck = subtreeCardCount === 0;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards?.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    return (cards ?? []).filter((c: CardRecord) => {
      if (c.id === pendingCardDeleteId) return false;
      if (activeTag && !c.tags?.includes(activeTag)) return false;
      const q = search.trim().toLowerCase();
      if (q && !c.front.toLowerCase().includes(q) && !c.back.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cards, search, activeTag, pendingCardDeleteId]);

  async function submitNewCard(values: CardFormValues) {
    await addCard(id, values.front, values.back, { type: values.type, clozeText: values.clozeText, tags: values.tags });
    setActivePanel('none');
  }

  async function submitEditCard(cardId: string, values: CardFormValues) {
    await updateCard(cardId, values);
    setEditingCardId(null);
  }

  function removeDeck() {
    setConfirmDeckDelete(false);
    setDeckDeletePending(true);
    deckDeleteTimer.current = setTimeout(async () => {
      await deleteDeck(id);
      navigate(parentDeck ? `/deck/${parentDeck.id}` : '/decks');
    }, UNDO_MS);
  }

  function undoRemoveDeck() {
    if (deckDeleteTimer.current) clearTimeout(deckDeleteTimer.current);
    setDeckDeletePending(false);
  }

  async function submitNewSubdeck(name: string, color: string, icon: string | undefined) {
    await createDeck(name, { parentId: id, color, icon });
  }

  function removeCard(cardId: string) {
    setConfirmCardId(null);
    setPendingCardDeleteId(cardId);
    cardDeleteTimer.current = setTimeout(async () => {
      await deleteCard(cardId);
      setPendingCardDeleteId(null);
    }, UNDO_MS);
  }

  function undoRemoveCard() {
    if (cardDeleteTimer.current) clearTimeout(cardDeleteTimer.current);
    setPendingCardDeleteId(null);
  }

  if (!deck) {
    return (
      <div className="screen screen-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '60vh' }}>
        <h2 style={{ fontSize: 20 }}>Deck introuvable</h2>
        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Ce deck n'existe plus ou n'a jamais existé.</p>
        <button className="btn-pill btn-primary" onClick={() => navigate('/decks')}>
          Retour aux decks
        </button>
      </div>
    );
  }

  if (deckDeletePending) {
    return (
      <div className="screen screen-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '60vh' }}>
        <h2 style={{ fontSize: 20 }}>Deck supprimé</h2>
        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>« {deck.name} » a été supprimé.</p>
        <button className="btn-pill btn-primary" onClick={undoRemoveDeck}>
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="screen screen-enter">
      <button
        onClick={() => navigate(parentDeck ? `/deck/${parentDeck.id}` : '/decks')}
        style={{ background: 'none', color: 'var(--text-dim)', fontSize: 14, marginBottom: 12, padding: 0 }}
      >
        ← {parentDeck ? parentDeck.name : 'Decks'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: confirmDeckDelete || showBadgeEditor || activePanel !== 'none' ? 12 : 20 }}>
        <button type="button" onClick={() => setShowBadgeEditor((v) => !v)} aria-label="Personnaliser l'icône du deck" style={{ padding: 0 }}>
          <DeckBadge color={deck.color} icon={deck.icon} size={40} />
        </button>
        <h1 style={{ fontSize: 24, flex: 1 }}>{deck.name}</h1>
        <button
          onClick={() => {
            setActivePanel((p) => (p === 'menu' ? 'none' : 'menu'));
            setEditingCardId(null);
          }}
          aria-label="Ajouter"
          className="icon-btn"
          style={{ color: 'var(--text-dim)' }}
        >
          <PlusIcon size={20} />
        </button>
        {!confirmDeckDelete && (
          <button
            onClick={() => setConfirmDeckDelete(true)}
            aria-label="Supprimer ce deck"
            className="icon-btn"
            style={{ color: 'var(--text-dim)' }}
          >
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      <AnimatedPanel open={showBadgeEditor}>
        <DeckBadgePicker
          color={deck.color}
          icon={deck.icon}
          onChange={(color, icon) => updateDeckAppearance(id, color, icon)}
        />
      </AnimatedPanel>

      {activePanel === 'menu' && (
        <AddActionMenu
          actions={[
            { key: 'add', label: 'Ajouter une carte', Icon: AddCardIcon, onClick: () => setActivePanel('add') },
            { key: 'subdeck', label: 'Créer un sous-deck', Icon: AddDeckIcon, onClick: () => setActivePanel('subdeck') },
            { key: 'import', label: 'Importer des cartes', Icon: UploadIcon, onClick: () => setActivePanel('import') },
          ]}
        />
      )}

      {activePanel === 'add' && <CardForm submitLabel="Ajouter" onCancel={() => setActivePanel('none')} onSubmit={submitNewCard} />}

      {activePanel === 'subdeck' && (
        <NewDeckForm
          placeholder="Nom du sous-deck"
          initialColor={deck.color}
          onCreate={submitNewSubdeck}
          onDone={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'import' && <ImportCardsPanel defaultDeckId={id} onDone={() => setActivePanel('none')} />}

      {confirmDeckDelete && (
        <div className="card-surface" style={{ padding: 14, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14 }}>
            Supprimer « {deck.name} »{subdeckCount > 0 && ` et ses ${subdeckCount} sous-deck${subdeckCount > 1 ? 's' : ''}`}, avec{' '}
            {subtreeCardCount} carte{subtreeCardCount > 1 ? 's' : ''} au total ? Cette action est irréversible.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-pill"
              style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text)' }}
              onClick={() => setConfirmDeckDelete(false)}
            >
              Annuler
            </button>
            <button
              className="btn-pill"
              style={{ flex: 1, background: 'var(--again)', color: 'white', ...cssVars({ '--btn-shadow': 'var(--again-dark)' }) }}
              onClick={removeDeck}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {isEmptyDeck ? (
        <button
          className="btn-pill btn-primary"
          style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => {
            setActivePanel('add');
            setEditingCardId(null);
          }}
        >
          <PlusIcon size={18} />
          Ajoute ta première carte
        </button>
      ) : (
        <>
          <button
            className="btn-pill btn-primary"
            style={{ width: '100%', marginBottom: 12 }}
            disabled={(dueCount ?? 0) === 0}
            onClick={() => navigate(`/review/${id}`)}
          >
            {(dueCount ?? 0) > 0 ? `Réviser (${dueCount})` : 'Rien à réviser'}
          </button>

          <button
            className="btn-pill"
            style={{
              width: '100%',
              marginBottom: 16,
              background: 'var(--good)',
              color: 'white',
              ...cssVars({ '--btn-shadow': 'var(--good-dark)' }),
            }}
            disabled={learnCount === 0}
            onClick={() => navigate(`/learn/${id}`)}
          >
            {learnCount > 0 ? `Apprendre (${learnCount})` : 'Tout est appris'}
          </button>
        </>
      )}

      {childDecks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {childDecks.map((child, i) => (
            <DeckTreeRow
              key={child.id}
              deck={child}
              depth={0}
              childrenMap={childrenMap}
              stats={deckStats}
              onNavigate={(deckId) => navigate(`/deck/${deckId}`)}
              animationDelay={i * 40}
            />
          ))}
        </div>
      )}

      {cards && cards.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: allTags.length > 0 ? 10 : 16, background: 'var(--surface-2)', borderRadius: 999, padding: '10px 14px' }}>
          <SearchIcon size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une carte"
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none' }}
          />
        </div>
      )}

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="btn-pill"
              style={{
                padding: '4px 12px',
                fontSize: 12,
                background: activeTag === tag ? 'var(--primary)' : 'var(--surface-2)',
                color: activeTag === tag ? 'var(--on-primary)' : 'var(--text-dim)',
                ...(activeTag === tag ? cssVars({ '--btn-shadow': 'var(--primary-dark)' }) : {}),
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredCards.map((card, i) => {
          if (editingCardId === card.id) {
            return (
              <CardForm
                key={card.id}
                initial={{ front: card.front, back: card.back, type: card.type ?? 'basic', clozeText: card.clozeText, tags: card.tags }}
                submitLabel="Enregistrer"
                onCancel={() => setEditingCardId(null)}
                onSubmit={(values) => submitEditCard(card.id!, values)}
              />
            );
          }
          return (
            <div
              key={card.id}
              className="card-surface card-enter"
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                opacity: card.suspended ? 0.55 : 1,
                animationDelay: `${Math.min(i * 30, 300)}ms`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingCardId(card.id!)}
                  aria-label="Modifier cette carte"
                  className="selectable-text"
                  style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', padding: 0 }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.front}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.back}
                  </div>
                  {((card.tags && card.tags.length > 0) || card.suspended) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {card.suspended && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--hard)' }}>
                          Suspendue
                        </span>
                      )}
                      {card.tags?.map((t) => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {confirmCardId !== card.id && (
                    <>
                      <button
                        onClick={() => card.id && setCardSuspended(card.id, !card.suspended)}
                        aria-label={card.suspended ? 'Réactiver cette carte' : 'Suspendre cette carte'}
                        className="icon-btn"
                        style={{ color: 'var(--text-dim)', width: 36, height: 36 }}
                      >
                        {card.suspended ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
                      </button>
                      <button
                        onClick={() => card.id && setConfirmCardId(card.id)}
                        aria-label="Supprimer cette carte"
                        className="icon-btn"
                        style={{ color: 'var(--text-dim)', width: 36, height: 36 }}
                      >
                        <CloseIcon size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {confirmCardId === card.id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-pill"
                    style={{ flex: 1, padding: '8px 14px', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text)' }}
                    onClick={() => setConfirmCardId(null)}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-pill"
                    style={{ flex: 1, padding: '8px 14px', fontSize: 13, background: 'var(--again)', color: 'white', ...cssVars({ '--btn-shadow': 'var(--again-dark)' }) }}
                    onClick={() => card.id && removeCard(card.id)}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {cards?.length === 0 && activePanel !== 'add' && !isEmptyDeck && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 30 }}>Aucune carte pour l'instant.</div>
        )}
        {cards && cards.length > 0 && filteredCards.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 30 }}>Aucune carte ne correspond à ta recherche.</div>
        )}
      </div>

      {pendingCardDeleteId && (
        <div
          className="card-surface card-enter"
          style={{
            position: 'fixed',
            // Not translateX(-50%): .card-enter's own keyframe animates `transform`, which wins
            // the cascade over this inline value and would clobber the centering with it.
            left: 20,
            right: 20,
            margin: '0 auto',
            maxWidth: 448,
            bottom: 'calc(20px + env(safe-area-inset-bottom))',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 60,
          }}
        >
          <span style={{ fontSize: 14 }}>Carte supprimée</span>
          <button
            className="btn-pill"
            style={{ padding: '6px 16px', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text)' }}
            onClick={undoRemoveCard}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 15,
  fontFamily: 'inherit',
  resize: 'none',
};
