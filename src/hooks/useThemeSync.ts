import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getThemePreference } from '../db/settings';

/** Applies the stored theme preference to the document root, reactively. */
export function useThemeSync() {
  const theme = useLiveQuery(() => getThemePreference(), []);

  useEffect(() => {
    if (!theme) return;
    if (theme === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);
}
