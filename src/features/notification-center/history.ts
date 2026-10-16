import { AccessProfile, AcademyId } from '../../types/academy';

export const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const HISTORY_GROUP_WINDOW_MS = 5 * 60 * 1000;
export interface HistoryEntry {
  id: string;
  academy: AcademyId;
  cycleName: string;
  date: string;
  targetId: string;
  eventName: string;
  changeType: string;
  previewText: string;
  changedFields: string[];
  createdAt: number;
}
export interface HistoryPage {
  items: HistoryEntry[];
  nextCursor: { id: string; createdAt: number } | null;
}
export interface HistoryGroup {
  id: string;
  entries: HistoryEntry[];
}

export function groupHistory(entries: HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const active = new Map<string, HistoryGroup>();
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  for (const entry of sorted) {
    // Legacy "day" notifications can describe different deleted events; never infer identity from a name.
    const groupable = /^event:.+/.test(entry.targetId);
    const key = JSON.stringify([entry.academy, entry.cycleName, entry.date, entry.targetId, new Date(entry.createdAt).toDateString()]);
    const group = groupable ? active.get(key) : undefined;
    if (group && group.entries[0].createdAt - entry.createdAt <= HISTORY_GROUP_WINDOW_MS) {
      group.entries.push(entry);
      group.id = entry.id;
    } else {
      const next = { id: entry.id, entries: [entry] };
      groups.push(next);
      if (groupable) active.set(key, next);
    }
  }
  return groups;
}
export interface HistoryState {
  readThrough: number;
  read: Record<string, number>;
  cleared: Record<string, number>;
}
export const emptyHistoryState = (): HistoryState => ({ readThrough: 0, read: {}, cleared: {} });
export const historyStorageKey = (profile: AccessProfile, testMode: boolean) =>
  `ncoa_notification_history_v1:${testMode ? 'test' : 'production'}:${profile.academy}:${profile.accessLevel}:${profile.studentCycleName || 'staff'}`;

export function loadHistoryState(key: string, now = Date.now()): HistoryState {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || 'null');
    const prune = (values: unknown) => Object.fromEntries(Object.entries(values && typeof values === 'object' ? values : {})
      .filter(([id, time]) => /^[a-f0-9]{64}$/.test(id) && typeof time === 'number' && time >= now - HISTORY_RETENTION_MS && time <= now));
    return { readThrough: Number.isFinite(saved?.readThrough) ? Math.min(saved.readThrough, now) : 0,
      read: prune(saved?.read), cleared: prune(saved?.cleared) };
  } catch { return emptyHistoryState(); }
}

export function isUnread(entry: HistoryEntry, state: HistoryState) {
  return entry.createdAt > state.readThrough && !state.read[entry.id] && !state.cleared[entry.id];
}

export function allowedHistory(entries: HistoryEntry[], profile: AccessProfile, now = Date.now()) {
  return entries.filter(entry => entry.academy === profile.academy
    && entry.createdAt >= now - HISTORY_RETENTION_MS && entry.createdAt <= now
    && (profile.accessLevel !== 'STUDENT' || (Boolean(profile.studentCycleName)
      && entry.cycleName === profile.studentCycleName && entry.targetId !== 'sglNotes')))
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}

export function historyDayLabel(createdAt: number, now = new Date()) {
  const date = new Date(createdAt);
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString() ? 'Yesterday'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
