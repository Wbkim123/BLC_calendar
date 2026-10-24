import { useState } from 'react';
import { tourStorageKey } from './policy';

export function useFeatureTour(eligible: boolean, blocked = false) {
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(tourStorageKey()) === 'seen'; }
    catch { return false; }
  });
  const [manual, setManual] = useState(false);
  const pending = eligible && (manual || !seen);
  return {
    pending,
    open: pending && !blocked,
    replay: () => setManual(true),
    dismiss: () => {
      setSeen(true);
      setManual(false);
      try { localStorage.setItem(tourStorageKey(), 'seen'); } catch { /* The hook retains dismissal for this session. */ }
    }
  };
}
