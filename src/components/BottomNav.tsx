import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, DecksIcon, ProgressionIcon, ProfileIcon } from './Icon';

const items = [
  { to: '/', label: 'Accueil', Icon: HomeIcon },
  { to: '/decks', label: 'Decks', Icon: DecksIcon },
  { to: '/progression', label: 'Progrès', Icon: ProgressionIcon },
  { to: '/profil', label: 'Profil', Icon: ProfileIcon },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.to === pathname)
  );

  return (
    <nav className="bottom-nav">
      <span className="bottom-nav-indicator" style={{ left: `calc(${activeIndex} * 25% + 5px)` }} />
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className="bottom-nav-item"
          style={({ isActive }) => ({ color: isActive ? 'var(--primary-fg)' : 'var(--text-dim)' })}
        >
          <item.Icon size={21} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
