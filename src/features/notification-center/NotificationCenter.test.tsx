import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, jest, test } from '@jest/globals';
import NotificationCenter from './NotificationCenter';
import { fetchHistoryPage } from './api';
import { AccessProfile } from '../../types/academy';
import { HistoryEntry, HistoryPage, historyStorageKey } from './history';

jest.mock('./api', () => ({ fetchHistoryPage: require('@jest/globals').jest.fn() }));
const fetchPage = jest.mocked(fetchHistoryPage);
const profile: AccessProfile = { role: 'VIEWER', accessLevel: 'SENIOR', academy: 'BLC', scope: 'BLC', permissions: ['schedule.read'] };
const entry = (id = 'a', overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: id.repeat(64), academy: 'BLC', cycleName: '12-30', date: '2030-10-16', targetId: 'event:one',
  eventName: `Event ${id}`, changeType: 'Event updated', previewText: 'TIME: 0600 → 0630', changedFields: ['time'],
  createdAt: Date.now() - 1000, ...overrides
});
beforeEach(() => { window.localStorage.clear(); fetchPage.mockReset(); });

test('opening the inbox preserves unread; selecting an item marks only that item and follows its target', async () => {
  const item = entry();
  const onSelect = jest.fn(() => null);
  fetchPage.mockResolvedValue({ items: [item], nextCursor: null });
  render(<NotificationCenter profile={profile} testMode={false} onSelect={onSelect} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  expect(screen.getByRole('button', { name: 'Notifications, unread notifications' })).toBeTruthy();
  fireEvent.click(screen.getByText(item.eventName));
  expect(onSelect).toHaveBeenCalledWith(item);
  await screen.findByRole('button', { name: 'Notifications' });
  expect(screen.queryByRole('dialog')).toBeNull();
  const saved = JSON.parse(window.localStorage.getItem(historyStorageKey(profile, false)) || '{}');
  expect(saved.read[item.id]).toBe(item.createdAt);
});

test('left swipe reveals Clear, vertical scrolling does not, and Undo restores an unread item', async () => {
  const item = entry();
  fetchPage.mockResolvedValue({ items: [item], nextCursor: null });
  render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  const row = screen.getByText(item.eventName).closest('.notification-history-row')!;
  fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 200 }] });
  fireEvent.touchEnd(row, { changedTouches: [{ clientX: 180, clientY: 80 }] });
  expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 200 }] });
  fireEvent.touchEnd(row, { changedTouches: [{ clientX: 80, clientY: 195 }] });
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.queryByText(item.eventName)).toBeNull();
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText(item.eventName)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Notifications, unread notifications' })).toBeTruthy();
});

test('mark all reads every fetched page and a new alert at the same timestamp remains unread', async () => {
  const first = entry('a');
  const second = entry('b', { createdAt: first.createdAt });
  const third = entry('c', { createdAt: first.createdAt });
  fetchPage.mockImplementation(async (_profile, cursor) => cursor
    ? { items: [second], nextCursor: null }
    : { items: [first], nextCursor: { id: first.id, createdAt: first.createdAt } });
  render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Mark all as read' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  fetchPage.mockResolvedValue({ items: [third, first, second], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByRole('button', { name: 'Notifications, unread notifications' });
});

test('student filtering removes other academies, cycles and staff-only notes; deleted item displays explanation', async () => {
  const student: AccessProfile = { ...profile, role: 'STUDENT', accessLevel: 'STUDENT', studentCycleName: '12-30' };
  fetchPage.mockResolvedValue({ items: [entry('a'), entry('b', { academy: 'KTA' }), entry('c', { cycleName: '11-30' }), entry('d', { targetId: 'sglNotes' })], nextCursor: null });
  render(<NotificationCenter profile={student} testMode={false} onSelect={() => 'This event has been deleted or replaced.'} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  expect(screen.queryByText('Event b')).toBeNull();
  expect(screen.queryByText('Event c')).toBeNull();
  expect(screen.queryByText('Event d')).toBeNull();
  fireEvent.click(screen.getByText('Event a'));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByText('This event has been deleted or replaced.')).toBeTruthy();
});

test('late responses from previous academy cannot populate the new inbox; test mode never queries production', async () => {
  let finish!: (page: HistoryPage) => void;
  fetchPage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  fetchPage.mockResolvedValue({ items: [], nextCursor: null });
  rerender(<NotificationCenter profile={{ ...profile, academy: 'KTA', scope: 'KTA' }} testMode={false} onSelect={() => null} />);
  await act(async () => { finish({ items: [entry()], nextCursor: null }); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Notifications' })); });
  expect(screen.queryByText('Event a')).toBeNull();
  const calls = fetchPage.mock.calls.length;
  rerender(<NotificationCenter profile={profile} testMode onSelect={() => null} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Notifications' })); });
  expect(screen.getByText('Notification history is unavailable in test mode.')).toBeTruthy();
  expect(fetchPage.mock.calls.length).toBe(calls);
});

test('a failed refresh shows a retryable error instead of a misleading empty inbox', async () => {
  fetchPage.mockRejectedValue(new Error('Notification history is unavailable. Please try again.'));
  render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  await screen.findByLabelText('History unavailable');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Notifications' })); });
  expect(screen.getByRole('alert').textContent).toContain('unavailable');
  expect(screen.queryByText("You're all caught up.")).toBeNull();
});

test('Clear all snapshots every page; Undo restores only that action and leaves new arrivals unread', async () => {
  const first = entry('a', { targetId: 'event:first' });
  const second = entry('b', { targetId: 'event:second' });
  const previouslyCleared = entry('c', { targetId: 'event:third' });
  const incoming = entry('d', { targetId: 'event:fourth' });
  window.localStorage.setItem(historyStorageKey(profile, false), JSON.stringify({ readThrough: 0, read: {}, cleared: { [previouslyCleared.id]: previouslyCleared.createdAt } }));
  fetchPage.mockImplementation(async (_profile, cursor) => cursor ? { items: [second, previouslyCleared], nextCursor: null }
    : { items: [first], nextCursor: { id: first.id, createdAt: first.createdAt } });
  render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(screen.queryByText('Event a')).toBeNull();
  expect(screen.queryByText('Event b')).toBeNull();
  expect(screen.getByText('2 notifications cleared')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  fetchPage.mockResolvedValue({ items: [incoming, first, second, previouslyCleared], nextCursor: null });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh' })); });
  expect(screen.getByText('Event d')).toBeTruthy();
  expect(screen.queryByText('Event a')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('Event a')).toBeTruthy();
  expect(screen.getByText('Event b')).toBeTruthy();
  expect(screen.queryByText('Event c')).toBeNull();
  expect(screen.getByRole('button', { name: 'Notifications, unread notifications' })).toBeTruthy();
});

test('a group displays the latest preview, expands originals without marking read, and clears/restores all its members', async () => {
  const latest = entry('a', { previewText: 'Latest time: 0700' });
  const older = entry('b', { createdAt: latest.createdAt - 60000, previewText: 'Earlier time: 0630' });
  fetchPage.mockResolvedValue({ items: [older, latest], nextCursor: null });
  const { unmount } = render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  expect(screen.getByText('2 changes · Latest update')).toBeTruthy();
  expect(screen.getByText('Latest time: 0700')).toBeTruthy();
  expect(screen.queryByText('Earlier time: 0630')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View all 2 changes' }));
  expect(screen.getByText('Earlier time: 0630')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Notifications, unread notifications' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear options for Event a' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.queryByText('2 changes · Latest update')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('2 changes · Latest update')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  unmount();
  render(<NotificationCenter profile={profile} testMode={false} onSelect={() => null} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Notifications' })); });
  await screen.findByText("You're all caught up.");
});

test('selecting an individual change reads only it; selecting the group reads all visible members', async () => {
  const latest = entry('a');
  const older = entry('b', { createdAt: latest.createdAt - 60000 });
  const onSelect = jest.fn(() => 'Stay in history for test');
  fetchPage.mockResolvedValue({ items: [latest, older], nextCursor: null });
  render(<NotificationCenter profile={profile} testMode={false} onSelect={onSelect} />);
  const bell = await screen.findByRole('button', { name: 'Notifications, unread notifications' });
  await act(async () => { fireEvent.click(bell); });
  fireEvent.click(screen.getByRole('button', { name: 'View all 2 changes' }));
  fireEvent.click(within(screen.getByRole('list', { name: 'Individual changes' })).getByText('Event b'));
  expect(onSelect).toHaveBeenLastCalledWith(older);
  expect(screen.getByRole('button', { name: 'Notifications, unread notifications' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Hide changes' }));
  fireEvent.click(screen.getByText('Event a'));
  expect(onSelect).toHaveBeenLastCalledWith(latest);
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
});
