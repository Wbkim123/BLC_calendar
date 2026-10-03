import type { ScheduleConflict } from './conflicts';

export const getDismissedConflictStorageKey = (academy: string | undefined, date: string) =>
  `blc_dismissed_conflicts_v1:${academy || 'unknown'}:${date}`;

export const getConflictPairKey = (conflict: ScheduleConflict) =>
  JSON.stringify([
    conflict.kind,
    [conflict.first, conflict.second]
      .map(event => [event.id, event.time, event.location.trim().toUpperCase()])
      .sort((first, second) => String(first[0]).localeCompare(String(second[0]))),
    conflict.otherAcademy || ''
  ]);

export const loadDismissedConflictKeys = (storageKey: string) => {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? new Set(saved.filter((value): value is string => typeof value === 'string')) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};
