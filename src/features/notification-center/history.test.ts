import { beforeEach, expect, test } from '@jest/globals';
import { allowedHistory, emptyHistoryState, groupHistory, HistoryEntry, historyStorageKey, HISTORY_GROUP_WINDOW_MS, HISTORY_RETENTION_MS, loadHistoryState } from './history';
import { AccessProfile } from '../../types/academy';

const profile: AccessProfile = { role: 'VIEWER', academy: 'BLC', scope: 'BLC', accessLevel: 'SENIOR', permissions: ['schedule.read'] };
beforeEach(() => window.localStorage.clear());
test('local state is isolated by environment, academy and access profile', () => {
  const key = historyStorageKey(profile, false);
  expect(key).not.toBe(historyStorageKey(profile, true));
  expect(key).not.toBe(historyStorageKey({ ...profile, academy: 'KTA' }, false));
  expect(key).not.toBe(historyStorageKey({ ...profile, accessLevel: 'NCOA_MANAGER' }, false));
  expect(historyStorageKey({ ...profile, studentCycleName: '12-30' }, false)).not.toBe(historyStorageKey({ ...profile, studentCycleName: '11-30' }, false));
});
test('expired and corrupt read/clear state is pruned without erasing valid saved state', () => {
  const now = Date.now();
  const id = 'a'.repeat(64);
  window.localStorage.setItem('state', JSON.stringify({ read: { [id]: now - 100 }, cleared: { ['b'.repeat(64)]: now - HISTORY_RETENTION_MS - 1 } }));
  expect(loadHistoryState('state', now)).toEqual({ readThrough: 0, read: { [id]: now - 100 }, cleared: {} });
  window.localStorage.setItem('state', 'broken');
  expect(loadHistoryState('state')).toEqual(emptyHistoryState());
});
test('a student with no assigned cycle cannot see any notification', () => {
  expect(allowedHistory([{ id: 'a', academy: 'BLC', cycleName: '', date: '2030-10-16', targetId: 'day', eventName: '', changeType: '', previewText: '', changedFields: [], createdAt: Date.now() }],
    { ...profile, role: 'STUDENT', accessLevel: 'STUDENT' })).toEqual([]);
});

const change = (id: string, offset = 0, overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id, academy: 'BLC', cycleName: '12-30', date: '2030-10-16', targetId: 'event:one', eventName: 'Training',
  changeType: 'Event updated', previewText: id, changedFields: ['time'], createdAt: new Date(2030, 9, 16, 12).getTime() - offset, ...overrides
});
test('groups interleaved changes to the same event, keeps latest summary and preserves every original', () => {
  const changes = [change('old', 120000, { eventName: 'Old name' }), change('new'), change('other', 60000, { targetId: 'event:two' })];
  const groups = groupHistory(changes);
  expect(groups.map(group => group.entries.map(entry => entry.id))).toEqual([['new', 'old'], ['other']]);
  expect(groups[0].entries[0].previewText).toBe('new');
  expect(changes.map(entry => entry.id)).toEqual(['old', 'new', 'other']);
});
test('five-minute window is bounded by the newest member, not an indefinitely extended chain', () => {
  const groups = groupHistory([change('new'), change('boundary', HISTORY_GROUP_WINDOW_MS), change('outside', HISTORY_GROUP_WINDOW_MS + 1)]);
  expect(groups.map(group => group.entries.map(entry => entry.id))).toEqual([['new', 'boundary'], ['outside']]);
});
test('never groups across academy, cycle, schedule date, event identity or ambiguous legacy day notifications', () => {
  const entries = [change('one'), change('school', 1, { academy: 'KTA' }), change('cycle', 2, { cycleName: '11-30' }),
    change('date', 3, { date: '2030-10-17' }), change('event', 4, { targetId: 'event:two' }),
    change('deleted1', 5, { targetId: 'day', changeType: 'Event deleted' }), change('deleted2', 6, { targetId: 'day', changeType: 'Event deleted' })];
  expect(groupHistory(entries).length).toBe(entries.length);
});
test('a group never crosses the local day headings even when changes are close together', () => {
  const midnight = new Date(2030, 9, 16, 0, 1).getTime();
  expect(groupHistory([change('today', 0, { createdAt: midnight }), change('yesterday', 0, { createdAt: midnight - 120000 })]).length).toBe(2);
});
