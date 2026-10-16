import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessProfile } from '../../types/academy';
import { fetchHistoryPage } from './api';
import { allowedHistory, HistoryEntry, HistoryPage, HistoryState, historyStorageKey, isUnread, loadHistoryState } from './history';

export default function useNotificationHistory(profile: AccessProfile, testMode: boolean) {
  const storageKey = historyStorageKey(profile, testMode);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [state, setState] = useState(() => loadHistoryState(storageKey));
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (testMode || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    // Abort includes native auth restoration and all pages, not just the HTTP request.
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      let cursor: HistoryPage['nextCursor'] = null;
      const all: HistoryEntry[] = [];
      const cursors = new Set<string>();
      do {
        const page: HistoryPage = await fetchHistoryPage(profile, cursor, controller.signal);
        if (controller.signal.aborted) return;
        all.push(...page.items);
        cursor = page.nextCursor;
        if (cursor) {
          const key = `${cursor.createdAt}:${cursor.id}`;
          if (cursors.has(key)) throw new Error('Notification history is unavailable. Please try again.');
          cursors.add(key);
        }
      } while (cursor);
      setEntries(allowedHistory(Array.from(new Map(all.map(entry => [entry.id, entry])).values()), profile));
      setLoaded(true);
      setError('');
    } catch (failure) {
      if (requestRef.current === controller) {
        setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message
          : 'Notification history could not be refreshed. Please try again.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
    }
  }, [profile, testMode]);

  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    refreshVisible();
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    window.addEventListener('online', refreshVisible);
    window.addEventListener('blc-schedule-notification', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener('online', refreshVisible);
      window.removeEventListener('blc-schedule-notification', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      const request = requestRef.current;
      requestRef.current = null;
      request?.abort();
    };
  }, [refresh]);

  const updateState = (update: (previous: HistoryState) => HistoryState) => {
    setState(previous => {
      const next = update(previous);
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { setStorageError('Changes could not be saved on this device. They may reset when you reopen the app.'); }
      return next;
    });
  };
  const recent = allowedHistory(entries, profile);
  return {
    entries: recent.filter(entry => !state.cleared[entry.id]),
    unread: recent.some(entry => isUnread(entry, state)), state, error, storageError, loading, loaded, refresh,
    markRead: (entry: HistoryEntry) => updateState(previous => ({ ...previous, read: { ...previous.read, [entry.id]: entry.createdAt } })),
    markReadMany: (items: HistoryEntry[]) => updateState(previous => ({ ...previous,
      read: { ...previous.read, ...Object.fromEntries(items.map(entry => [entry.id, entry.createdAt])) } })),
    markAllRead: () => updateState(previous => ({ ...previous,
      read: { ...previous.read, ...Object.fromEntries(recent.map(entry => [entry.id, entry.createdAt])) } })),
    clearMany: (items: HistoryEntry[]) => updateState(previous => ({ ...previous,
      cleared: { ...previous.cleared, ...Object.fromEntries(items.map(entry => [entry.id, entry.createdAt])) } })),
    undo: (items: HistoryEntry[]) => updateState(previous => {
      const cleared = { ...previous.cleared };
      items.forEach(entry => delete cleared[entry.id]);
      return { ...previous, cleared };
    })
  };
}
