import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { dayKey } from '../utils/date';
import { getProfile, setProfile } from '../db/profile';
import { DECK_PALETTE } from '../db/decks';
import { GearIcon } from '../components/Icon';
import DeckBadge from '../components/DeckBadge';
import DeckBadgePicker from '../components/DeckBadgePicker';
import AnimatedPanel from '../components/AnimatedPanel';

const STATE_LABELS: Record<number, string> = { 0: 'Nouvelles', 1: 'Apprentissage', 2: 'Révision', 3: 'Réapprentissage' };

export default function Profil() {
  const navigate = useNavigate();
  const profile = useLiveQuery(() => getProfile(), []);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  const totalCards = useLiveQuery(() => db.cards.count(), []);
  const totalDecks = useLiveQuery(() => db.decks.count(), []);
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), []);

  const todayKey = dayKey(Date.now());
  const todayCount = logs?.filter((l) => dayKey(l.reviewedAt) === todayKey).length ?? 0;
  const totalReviews = logs?.length ?? 0;

  const byState = useLiveQuery(async () => {
    const cards = await db.cards.toArray();
    const map: Record<number, number> = {};
    for (const c of cards) map[c.state] = (map[c.state] ?? 0) + 1;
    return map;
  }, []);

  async function saveName() {
    const trimmed = nameDraft.trim();
    await setProfile({ name: trimmed || 'Moi', color: profile?.color ?? DECK_PALETTE[0], icon: profile?.icon });
    setEditingName(false);
  }

  return (
    <div className="screen screen-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28 }}>Profil</h1>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Réglages"
          className="icon-btn"
          style={{ color: 'var(--text-dim)' }}
        >
          <GearIcon size={20} />
        </button>
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          onClick={() => setShowAvatarEditor((v) => !v)}
          aria-label="Personnaliser l'avatar"
          style={{ padding: 0 }}
        >
          <DeckBadge color={profile?.color ?? DECK_PALETTE[0]} icon={profile?.icon} size={56} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '6px 10px',
                color: 'var(--text)',
                fontFamily: 'Baloo 2',
                fontWeight: 800,
                fontSize: 18,
                width: '100%',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(profile?.name ?? '');
                setEditingName(true);
              }}
              style={{
                textAlign: 'left',
                padding: 0,
                fontFamily: 'Baloo 2',
                fontWeight: 800,
                fontSize: 20,
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile?.name ?? 'Moi'}
            </button>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Personnalise ton profil</div>
        </div>
      </div>

      <AnimatedPanel open={showAvatarEditor}>
        <DeckBadgePicker
          color={profile?.color ?? DECK_PALETTE[0]}
          icon={profile?.icon}
          onChange={(color, icon) => setProfile({ name: profile?.name ?? 'Moi', color, icon })}
        />
      </AnimatedPanel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatBox label="Aujourd'hui" value={todayCount} delay={0} />
        <StatBox label="Decks" value={totalDecks ?? 0} delay={40} />
        <StatBox label="Cartes" value={totalCards ?? 0} delay={80} />
        <StatBox label="Révisions totales" value={totalReviews} delay={120} />
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, animationDelay: '160ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Répartition des cartes</div>
        {byState &&
          Object.entries(byState).map(([state, count]) => (
            <div key={state} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
              <span style={{ color: 'var(--text-dim)' }}>{STATE_LABELS[Number(state)]}</span>
              <span className="tabular-nums" style={{ fontWeight: 600 }}>{count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="card-surface card-enter" style={{ padding: 16, animationDelay: `${delay}ms` }}>
      <div className="tabular-nums" style={{ fontFamily: 'Baloo 2', fontWeight: 700, fontSize: 24 }}>{value}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{label}</div>
    </div>
  );
}
