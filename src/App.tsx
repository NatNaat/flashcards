import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './screens/Home';
import Decks from './screens/Decks';
import DeckDetail from './screens/DeckDetail';
import Review from './screens/Review';
import Learn from './screens/Learn';
import Progression from './screens/Progression';
import Profil from './screens/Profil';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import RewardLayer from './components/RewardLayer';
import { useThemeSync } from './hooks/useThemeSync';

function Layout({ children, showNav }: { children: React.ReactNode; showNav: boolean }) {
  return (
    <div className="app-shell">
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  useThemeSync();
  return (
    <>
      <RewardLayer />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout showNav><Home /></Layout>} />
          <Route path="/decks" element={<Layout showNav><Decks /></Layout>} />
          <Route path="/progression" element={<Layout showNav><Progression /></Layout>} />
          <Route path="/profil" element={<Layout showNav><Profil /></Layout>} />
          <Route path="/settings" element={<Layout showNav={false}><Settings /></Layout>} />
          <Route path="/deck/:deckId" element={<Layout showNav={false}><DeckDetail /></Layout>} />
          <Route path="/review/:deckId" element={<Layout showNav={false}><Review /></Layout>} />
          <Route path="/learn/:deckId" element={<Layout showNav={false}><Learn /></Layout>} />
        </Routes>
      </HashRouter>
    </>
  );
}
