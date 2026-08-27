import { NavLink } from 'react-router-dom';
import { HomeIcon, DecksIcon, ProgressionIcon, ProfileIcon } from './Icon';

const items = [
  { to: '/', label: 'Accueil', Icon: HomeIcon },
  { to: '/decks', label: 'Decks', Icon: DecksIcon },
  { to: '/progression', label: 'Progrès', Icon: ProgressionIcon },
  { to: '/profil', label: 'Profil', Icon: ProfileIcon },
];

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: isActive ? 'var(--primary-fg)' : 'var(--text-dim)',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 8px',
          })}
        >
          <item.Icon size={20} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
