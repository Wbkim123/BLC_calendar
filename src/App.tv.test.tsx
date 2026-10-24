import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { set } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import App from './App';
import { TV_ACCESS_CODES } from './features/auth/tvAccessCodes';
import { tourStorageKey } from './features/feature-tour/policy';

const mockDay = (cycleName: string, date: string) => ({ cycleName, date, dayLabel: 'Training', events: [] });
let mockDatabase: Record<string, unknown> = {};
let mockRealtimeEnabled = true;
let mockPlatform = 'web';
let mockScheduleError: ((error: Error) => void) | undefined;
const mockOwnerClaims: Record<string, unknown> = { admin: true };

jest.mock('./firebase', () => ({
  app: {}, db: {}, functions: {}, useFirebaseEmulators: false,
  getDatabaseRestUrl: (path: string) => `https://example.invalid/${path}.json`,
  auth: { currentUser: { getIdTokenResult: async () => ({ claims: mockOwnerClaims }) } }
}));
jest.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mockPlatform !== 'web', getPlatform: () => mockPlatform } }));
jest.mock('firebase/auth', () => ({ getAuth: () => ({}), signOut: require('@jest/globals').jest.fn(async () => undefined) }));
jest.mock('firebase/functions', () => ({ getFunctions: () => ({}) }));
jest.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  onValue: (path: string, callback: (snapshot: unknown) => void, onError?: (error: Error) => void) => {
    if (path.endsWith('schedules')) mockScheduleError = onError;
    if (mockRealtimeEnabled) callback({ val: () => mockDatabase[path] || null });
    return () => undefined;
  },
  set: require('@jest/globals').jest.fn(async () => undefined),
  update: require('@jest/globals').jest.fn(async () => undefined),
  remove: require('@jest/globals').jest.fn(async () => undefined)
}));
jest.mock('./notifications', () => ({
  clearAdminSessionToken: () => undefined,
  createAdminSession: async () => undefined,
  prepareNotificationEnvironment: async () => undefined,
  disableNotifications: async () => undefined,
  getAdminIdToken: async () => 'synthetic-id-token',
  getCrossAcademyConflictNotices: async () => [],
  isPhoneDevice: () => false,
  listenForForegroundNotifications: async () => () => undefined
}));
jest.mock('./features/ads/appOpen', () => ({
  showAppOpenAdIfEligible: () => undefined
}));
jest.mock('./components/GeneralSettings', () => ({ __esModule: true, default: ({ onLogout }: any) => <button onClick={onLogout}>Logout</button> }));
jest.mock('./components/NotificationPrompt', () => () => null);
jest.mock('./components/ScheduleImportModal', () => () => null);
jest.mock('./components/ScheduleNotificationModal', () => () => <div>Notification chooser</div>);
jest.mock('./components/Calendar', () => () => <div>Calendar screen</div>);
jest.mock('./components/DailyView', () => ({ __esModule: true, default: ({ schedule, onBack, viewControls, onSave, onCreateEvent, onDeleteEvent }: any) => (
  <div>{viewControls}<div>Events {schedule.cycleName}</div>{onBack && <button onClick={onBack}>Calendar</button>}
    {schedule.events.map((event: any) => <div key={event.id}>{event.eventName}</div>)}
    <button onClick={() => onSave(schedule.date, { ...schedule.events[0], eventName: 'Updated event' })}>Test save</button>
    <button onClick={() => onCreateEvent(schedule.date, { id: 'new-event', eventName: 'Created event', time: '1100-1200', location: 'CR', uniform: 'ACU' })}>Test create</button>
    <button onClick={() => onDeleteEvent(schedule.date, schedule.events[0].id)}>Test delete</button>
  </div>
) }));

beforeEach(() => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: (values: Uint32Array) => values.fill(1) } });
  window.localStorage.clear();
  window.localStorage.setItem(tourStorageKey(), 'seen');
  jest.clearAllMocks();
  mockPlatform = 'web';
  jest.mocked(signOut).mockReset().mockResolvedValue(undefined);
  mockRealtimeEnabled = true;
  mockScheduleError = undefined;
  mockDatabase = { schedules: [mockDay('BLC cycle', '2099-01-01')], 'academies/kta/schedules': [mockDay('KTA cycle', '2099-01-02')] };
  global.fetch = jest.fn(async (input: unknown) => ({
    ok: true,
    json: async () => mockDatabase[new URL(String(input)).pathname.slice(1).replace(/\.json$/, '')] || null
  })) as unknown as typeof fetch;
});

const loginTv = async (academy: 'BLC' | 'KTA') => {
  fireEvent.change(await screen.findByPlaceholderText('Enter Access Code'), { target: { value: TV_ACCESS_CODES[academy] } });
  fireEvent.click(screen.getByRole('button', { name: 'ENTER' }));
};

describe('website TV integration', () => {
  const prepareNativeChief = (platform: string, academy = 'BLC') => {
    mockPlatform = platform;
    mockRealtimeEnabled = false;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const path = academy === 'BLC' ? 'schedules' : 'academies/kta/schedules';
    mockDatabase[path] = [{ ...mockDay('Test cycle', date), events: [
      { id: 'event', eventName: 'Original event', time: '0900-1000', location: 'CR', uniform: 'ACU' }
    ] }];
    localStorage.setItem('blc_calendar_login', JSON.stringify({ role: 'ADMIN', profile: {
      role: 'ADMIN', accessLevel: 'SCHEDULE_IMPORTER', academy, scope: academy,
      permissions: ['schedule.read', 'schedule.write', 'schedule.import', 'location.manage']
    } }));
    return path;
  };

  it.each(['ios', 'android'])('reflects confirmed event edits, additions and deletion on %s without realtime delivery', async platform => {
    prepareNativeChief(platform);
    render(<App />);
    await screen.findByText('Original event');
    fireEvent.click(screen.getByText('Test save'));
    await screen.findByText('Updated event');
    expect(screen.queryByText('Original event')).toBeNull();
    expect(screen.getByText('Notification chooser')).toBeTruthy();
    fireEvent.click(screen.getByText('Test create'));
    await screen.findByText('Created event');
    fireEvent.click(screen.getByText('Test delete'));
    await waitFor(() => expect(screen.queryByText('Updated event')).toBeNull());
    expect(screen.getByText('Created event')).toBeTruthy();
  });

  it.each(['ios', 'android'])('automatically introduces features to an existing saved Chief login after updating on %s', async platform => {
    prepareNativeChief(platform);
    localStorage.removeItem(tourStorageKey());
    render(<App />);
    await screen.findByRole('dialog', { name: 'Your day, at a glance' });
    fireEvent.click(screen.getByRole('button', { name: 'Skip guide' }));
    expect(localStorage.getItem(tourStorageKey())).toBe('seen');
    expect(screen.getByText('Original event')).toBeTruthy();
  });

  it('does not update the schedule or offer notifications after a rejected save', async () => {
    prepareNativeChief('android');
    const originalRead = global.fetch;
    global.fetch = jest.fn((input, init) => init?.method === 'PATCH'
      ? Promise.resolve({ ok: false, status: 403 } as Response) : originalRead(input, init));
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    try {
      render(<App />);
      await screen.findByText('Original event');
      fireEvent.click(screen.getByText('Test save'));
      await waitFor(() => expect(alert).toHaveBeenCalled());
      expect(screen.getByText('Original event')).toBeTruthy();
      expect(screen.queryByText('Notification chooser')).toBeNull();
    } finally { alert.mockRestore(); }
  });

  it('writes the actual event database key after sparse events are normalized for display', async () => {
    const path = prepareNativeChief('android');
    const day = (mockDatabase[path] as any[])[0];
    mockDatabase[path] = { 'day-key': { ...day, events: { 'event-key': day.events[0] } } };
    render(<App />);
    await screen.findByText('Original event');
    fireEvent.click(screen.getByText('Test save'));
    await screen.findByText('Updated event');
    const write = jest.mocked(global.fetch).mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(Object.keys(JSON.parse(String(write?.[1]?.body)))).toEqual(['schedules/day-key/events/event-key']);
  });

  it('discards an old HTTPS response that arrives after a confirmed save', async () => {
    const path = prepareNativeChief('ios');
    render(<App />);
    await screen.findByText('Original event');
    const stale = JSON.parse(JSON.stringify(mockDatabase[path]));
    const originalRead = global.fetch;
    let finishOldRead: (response: Response) => void = () => undefined;
    let pauseRead = true;
    global.fetch = jest.fn((input, init) => {
      if (init?.method === 'PATCH') {
        const day = (mockDatabase[path] as any[])[0];
        mockDatabase[path] = [{ ...day, events: [{ ...day.events[0], eventName: 'Updated event' }] }];
        return Promise.resolve({ ok: true, status: 200 } as Response);
      }
      if (String(input).endsWith('/schedules.json') && pauseRead) {
        pauseRead = false;
        return new Promise<Response>(resolve => { finishOldRead = resolve; });
      }
      return originalRead(input, init);
    });
    fireEvent(document, new Event('visibilitychange'));
    fireEvent.click(screen.getByText('Test save'));
    await screen.findByText('Updated event');
    await act(async () => { finishOldRead({ ok: true, json: async () => stale } as Response); });
    expect(screen.queryByText('Original event')).toBeNull();
    expect(screen.getByText('Updated event')).toBeTruthy();
  });

  it('refreshes its own academy on native foreground and retains schedules on temporary read failure', async () => {
    const path = prepareNativeChief('ios', 'KTA');
    render(<App />);
    await screen.findByText('Original event');
    const day = (mockDatabase[path] as any[])[0];
    mockDatabase[path] = [{ ...day, events: [{ ...day.events[0], eventName: 'Remote change' }] }];
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByText('Remote change');
    const requests = jest.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(requests.some(url => url === 'https://example.invalid/schedules.json')).toBe(false);
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 503 } as Response);
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      fireEvent(window, new Event('online'));
      await screen.findByText(/Schedule refresh failed/);
      expect(screen.getByText('Remote change')).toBeTruthy();
    } finally { log.mockRestore(); }
  });

  it.each(['ios', 'android'])('logs in again on %s without waiting on unused JS Auth', async platform => {
    mockPlatform = platform;
    jest.mocked(signOut).mockImplementation(() => new Promise(() => undefined));
    render(<App />);
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out only the active web SDK session before logging in again', async () => {
    jest.mocked(signOut).mockImplementation(session => session === auth ? Promise.resolve() : new Promise(() => undefined));
    render(<App />);
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith(auth);
  });
  it('keeps HTTPS schedules when realtime transport fails and metadata is unavailable', async () => {
    mockRealtimeEnabled = false;
    global.fetch = jest.fn(async (input: unknown) => {
      const path = new URL(String(input)).pathname.slice(1).replace(/\.json$/, '');
      return { ok: path.endsWith('schedules'), status: 503, json: async () => mockDatabase[path] || null };
    }) as unknown as typeof fetch;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<App />);
      await loginTv('KTA');
      await screen.findByText('Events KTA cycle');
      act(() => mockScheduleError?.(new Error('transport unavailable')));
      expect(screen.getByText('Events KTA cycle')).toBeTruthy();
      expect(screen.queryByText('No schedules available for KTA.')).toBeNull();
    } finally { consoleError.mockRestore(); }
  });

  it('does not overwrite a realtime schedule with a late empty HTTPS response', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => null })) as unknown as typeof fetch;
    render(<App />);
    await loginTv('KTA');
    await screen.findByText('Events KTA cycle');
    await act(async () => undefined);
    expect(screen.getByText('Events KTA cycle')).toBeTruthy();
  });
  it('reloads the same academy after logout clears the displayed schedules', async () => {
    render(<App />);
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    expect(screen.queryByText('Events KTA cycle')).toBeNull();
  });
  it('opens a TV event screen without calendar access and does not write defaults', async () => {
    render(<App />);
    await loginTv('BLC');
    await screen.findByText('Events BLC cycle');
    expect(screen.queryByRole('button', { name: 'Calendar' })).toBeNull();
    expect(screen.getByLabelText('Cycle')).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
  });

  it('reads only KTA schedules after KTA TV login', async () => {
    render(<App />);
    await loginTv('KTA');
    await screen.findByText('Events KTA cycle');
    expect(screen.queryByText('Events BLC cycle')).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });

  it('shows an empty TV view when its academy has no schedules', async () => {
    delete mockDatabase['academies/kta/schedules'];
    render(<App />);
    await loginTv('KTA');
    await screen.findByText('No schedules available for KTA.');
    expect(screen.queryByText('Calendar screen')).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });

  it('invalidates remembered importer sessions even though their role is ADMIN', async () => {
    window.localStorage.setItem('blc_calendar_login', JSON.stringify({
      role: 'ADMIN', profile: { role: 'ADMIN', accessLevel: 'SCHEDULE_IMPORTER', academy: 'BLC', scope: 'BLC', permissions: ['schedule.read'] }
    }));
    render(<App />);
    await screen.findByPlaceholderText('Enter Access Code');
    await waitFor(() => expect(window.localStorage.getItem('blc_calendar_login')).toBeNull());
  });

  it('preserves the authenticated owner calendar', async () => {
    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText('Enter Access Code'), { target: { value: 'NCOA6120' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ENTER' })); });
    await screen.findByText('Calendar screen');
  });
});
