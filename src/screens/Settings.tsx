import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { getSwipeGradeMap, setSwipeGradeMap, getThemePreference, setThemePreference, getCardOrder, setCardOrder } from '../db/settings';
import { cycleSwipeDirection, SWIPE_DIRECTIONS, type SwipeDirection } from '../settings/swipe';
import { THEME_OPTIONS, type ThemePreference } from '../settings/theme';
import { CARD_ORDER_OPTIONS, type CardOrder } from '../settings/cardOrder';
import { gradeMeta } from '../scheduler/gradeMeta';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CloseIcon } from '../components/Icon';
import { cssVars } from '../utils/style';

const DIRECTION_LABELS: Record<SwipeDirection, string> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
};

const DIRECTION_ICONS: Record<SwipeDirection, typeof ArrowUpIcon> = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

const CARD_ORDER_LABELS: Record<CardOrder, string> = {
  random: 'Aléatoire',
  insertion: "Ordre d'ajout",
};

function SegmentedControl<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T | undefined;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="btn-pill"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 13,
              background: selected ? 'var(--primary)' : 'var(--surface-2)',
              color: selected ? 'var(--on-primary)' : 'var(--text)',
              ...(selected ? cssVars({ '--btn-shadow': 'var(--primary-dark)' }) : {}),
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const swipeMap = useLiveQuery(() => getSwipeGradeMap(), []);
  const theme = useLiveQuery(() => getThemePreference(), []);
  const cardOrder = useLiveQuery(() => getCardOrder(), []);

  async function handleCycle(direction: SwipeDirection) {
    if (!swipeMap) return;
    await setSwipeGradeMap(cycleSwipeDirection(swipeMap, direction));
  }

  return (
    <div className="screen screen-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Fermer les réglages"
          className="icon-btn"
          style={{ color: 'var(--text-dim)' }}
        >
          <CloseIcon size={18} />
        </button>
        <h1 style={{ fontSize: 24 }}>Réglages</h1>
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Thème</div>
        <SegmentedControl value={theme} options={THEME_OPTIONS} labels={THEME_LABELS} onChange={setThemePreference} />
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, marginBottom: 16, animationDelay: '40ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Ordre des cartes</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          S'applique au mode Apprendre, et sert de critère de départage en révision pour les cartes échues en même temps.
        </p>
        <SegmentedControl value={cardOrder} options={CARD_ORDER_OPTIONS} labels={CARD_ORDER_LABELS} onChange={setCardOrder} />
      </div>

      <div className="card-surface card-enter" style={{ padding: 18, animationDelay: '80ms' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Notation par glissement</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          En révision, une fois la réponse affichée, glisse la carte dans une direction pour la noter directement. Tape sur une
          direction ci-dessous pour changer la note qu'elle déclenche.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {swipeMap &&
            SWIPE_DIRECTIONS.map((direction) => {
              const meta = gradeMeta(swipeMap[direction]);
              const DirectionIcon = DIRECTION_ICONS[direction];
              return (
                <button
                  key={direction}
                  onClick={() => handleCycle(direction)}
                  className="btn-pill"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500 }}>
                    <DirectionIcon size={18} />
                    {DIRECTION_LABELS[direction]}
                  </span>
                  <span
                    style={{
                      background: meta.color,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
