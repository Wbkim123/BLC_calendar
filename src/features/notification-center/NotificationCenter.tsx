import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccessProfile } from '../../types/academy';
import { HistoryEntry, groupHistory, historyDayLabel, historyStorageKey, isUnread } from './history';
import useNotificationHistory from './useNotificationHistory';

interface Props {
  profile: AccessProfile;
  testMode: boolean;
  onSelect: (entry: HistoryEntry) => string | null;
}

function NotificationRow({ entries, unread, onSelect, onSelectEntry, onClear, isEntryUnread }: {
  entries: HistoryEntry[]; unread: boolean; onSelect: () => void; onSelectEntry: (entry: HistoryEntry) => void;
  onClear: () => void; isEntryUnread: (entry: HistoryEntry) => boolean;
}) {
  const entry = entries[0];
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(0);
  return (
    <div className="notification-history-row" style={{ touchAction: 'pan-y' }}
      onTouchStart={event => {
        event.stopPropagation();
        start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        swiped.current = 0;
      }}
      onTouchEnd={event => {
        event.stopPropagation();
        if (!start.current) return;
        const dx = event.changedTouches[0].clientX - start.current.x;
        const dy = event.changedTouches[0].clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swiped.current = Date.now();
          setRevealed(dx < 0);
        }
      }} onTouchCancel={() => { start.current = null; }}>
      <div className={`notification-history-card ${unread ? 'notification-history-unread' : ''}`}>
        <button type="button" className="notification-history-open" onClick={() => {
          if (Date.now() - swiped.current < 400) return;
          if (revealed) { setRevealed(false); return; }
          onSelect();
        }}>
          <span className="notification-history-meta">
            <span>{entry.academy}{entry.cycleName ? ` · ${entry.cycleName}` : ''}</span>
            <time dateTime={new Date(entry.createdAt).toISOString()}>{new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
          </span>
          <span className="notification-history-title">{unread && <span className="notification-history-dot" aria-label="Unread" />}{entry.eventName || entry.changeType}</span>
          {entries.length > 1 && <span className="notification-history-change-count">{entries.length} changes · Latest update</span>}
          {entry.eventName && <span className="notification-history-kind">{entry.changeType}</span>}
          <span className="notification-history-preview">{entry.previewText || 'Schedule updated'}</span>
          <span className="notification-history-date">Schedule: {entry.date}</span>
        </button>
        {entries.length > 1 && <>
          <button type="button" className="notification-history-expand" aria-expanded={expanded}
            aria-controls={`history-details-${entry.id}`} onClick={() => setExpanded(value => !value)}>
            {expanded ? 'Hide changes' : `View all ${entries.length} changes`}
          </button>
          {expanded && <ol id={`history-details-${entry.id}`} className="notification-history-details" aria-label="Individual changes">
            {entries.map(item => <li key={item.id}>
              <button type="button" onClick={() => onSelectEntry(item)}>
                <span className="notification-history-meta">
                  <span>{isEntryUnread(item) && <span className="notification-history-dot" aria-label="Unread" />}{item.changeType}</span>
                  <time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</time>
                </span>
                {item.eventName && <span className="notification-history-title">{item.eventName}</span>}
                <span className="notification-history-preview">{item.previewText || 'Schedule updated'}</span>
              </button>
            </li>)}
          </ol>}
        </>}
        <button type="button" className="notification-history-more" aria-label={`Clear options for ${entry.eventName || entry.changeType}`}
          aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>•••</button>
      </div>
      {revealed && <button type="button" className="notification-history-clear" onClick={onClear}>Clear</button>}
    </div>
  );
}

function ScopedNotificationCenter({ profile, testMode, onSelect }: Props) {
  const history = useNotificationHistory(profile, testMode);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [undoEntries, setUndoEntries] = useState<HistoryEntry[] | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!undoEntries) return;
    const timer = window.setTimeout(() => setUndoEntries(null), 6000);
    return () => window.clearTimeout(timer);
  }, [undoEntries]);

  useEffect(() => {
    if (!open) return;
    const bell = bellRef.current;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') || []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); bell?.focus(); };
  }, [open]);

  const clearEntries = (entries: HistoryEntry[]) => {
    history.clearMany(entries);
    setUndoEntries(entries);
  };
  const selectEntry = (entry: HistoryEntry, readEntries = [entry]) => {
    history.markReadMany(readEntries);
    const message = onSelect(entry);
    if (message) setNotice(message); else setOpen(false);
  };
  const groups = groupHistory(history.entries);
  let previousGroup = '';
  return <>
    <button ref={bellRef} type="button" className="notification-history-bell" aria-label={history.unread ? 'Notifications, unread notifications' : 'Notifications'}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); setNotice(''); void history.refresh(); }}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      {history.unread && <span className="notification-history-badge" aria-hidden="true" />}
      {history.error && !history.unread && <span className="notification-history-unavailable" aria-label="History unavailable">!</span>}
    </button>
    {open && createPortal(
      <div className="notification-history-overlay" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
        onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
        <div ref={dialogRef} className="notification-history-panel" role="dialog" aria-modal="true" aria-labelledby="notification-history-heading">
          <header className="notification-history-header">
            <div><h2 id="notification-history-heading">Notifications</h2><p>{profile.academy}{profile.studentCycleName ? ` · ${profile.studentCycleName}` : ''} · Last 30 days</p></div>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="notification-history-close">×</button>
          </header>
          <div className="notification-history-toolbar">
            <button type="button" disabled={!history.unread || history.loading} onClick={history.markAllRead}>Mark all as read</button>
            <button type="button" className="notification-history-clear-all" disabled={!history.entries.length || history.loading}
              onClick={() => clearEntries(history.entries)}>Clear all</button>
            <button type="button" disabled={history.loading || testMode} onClick={() => void history.refresh()}>{history.loading ? 'Refreshing…' : 'Refresh'}</button>
          </div>
          {notice && <p role="status" className="notification-history-notice mx-4">{notice}</p>}
          <div className="notification-history-list" aria-busy={history.loading}>
            <p className="notification-history-hint">Swipe left for Clear. Cleared alerts are hidden on this device only.</p>
            {testMode && <p role="status">Notification history is unavailable in test mode.</p>}
            {history.error && <p role="alert" className="notification-history-error">{history.error}{history.loaded ? ' Showing the last loaded history.' : ''}</p>}
            {history.storageError && <p role="alert" className="notification-history-error">{history.storageError}</p>}
            {!testMode && !history.loaded && history.loading && <p role="status">Loading notifications…</p>}
            {history.loaded && !history.error && history.entries.length === 0 && <div className="notification-history-empty">You're all caught up.<p>No notifications to show from the last 30 days.</p></div>}
            {groups.map(notificationGroup => {
              const entry = notificationGroup.entries[0];
              const group = historyDayLabel(entry.createdAt);
              const heading = group !== previousGroup;
              previousGroup = group;
              return <React.Fragment key={notificationGroup.id}>
                {heading && <h3 className="notification-history-group">{group}</h3>}
                <NotificationRow entries={notificationGroup.entries} unread={notificationGroup.entries.some(item => isUnread(item, history.state))}
                  isEntryUnread={item => isUnread(item, history.state)} onSelect={() => selectEntry(entry, notificationGroup.entries)}
                  onSelectEntry={item => selectEntry(item)} onClear={() => clearEntries(notificationGroup.entries)} />
              </React.Fragment>;
            })}
          </div>
          {undoEntries && <div className="notification-history-undo" role="status"><span>{undoEntries.length === 1 ? 'Notification cleared' : `${undoEntries.length} notifications cleared`}</span><button type="button" onClick={() => { history.undo(undoEntries); setUndoEntries(null); }}>Undo</button></div>}
        </div>
      </div>, document.body)}
  </>;
}

export default function NotificationCenter(props: Props) {
  // Remount state and cancel in-flight requests on academy, cycle, role or environment changes.
  return <ScopedNotificationCenter key={historyStorageKey(props.profile, props.testMode)} {...props} />;
}
