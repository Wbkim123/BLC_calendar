import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { set } from 'firebase/database';
import App from './App';
import { TV_ACCESS_CODES } from './features/auth/tvAccessCodes';

const mockDay = (cycleName: string, date: string) => ({ cycleName, date, dayLabel: 'Training', events: [] });
let mockDatabase: Record<string, unknown> = {};
const mockOwnerClaims: Record<string, unknown> = { admin: true };

jest.mock('./firebase', () => ({
  app: {}, db: {}, functions: {}, useFirebaseEmulators: false,
  getDatabaseRestUrl: (path: string) => `https://example.invalid/${path}.json`,
  auth: { currentUser: { getIdTokenResult: async () => ({ claims: mockOwnerClaims }) } }
}));
jest.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
jest.mock('firebase/auth', () => ({ getAuth: () => ({}), signOut: async () => undefined }));
jest.mock('firebase/functions', () => ({ getFunctions: () => ({}) }));
jest.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  onValue: (path: string, callback: (snapshot: unknown) => void) => {
    callback({ val: () => mockDatabase[path] || null });
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
  getAdminIdToken: async () => null,
  isPhoneDevice: () => false,
  listenForForegroundNotifications: async () => () => undefined
}));
jest.mock('./features/ads/appOpen', () => ({
  showAppOpenAdIfEligible: () => undefined
}));
jest.mock('./components/GeneralSettings', () => ({ __esModule: true, default: ({ onLogout }: any) => <button onClick={onLogout}>Logout</button> }));
jest.mock('./components/NotificationPrompt', () => () => null);
jest.mock('./components/ScheduleImportModal', () => () => null);
jest.mock('./components/ScheduleNotificationModal', () => () => null);
jest.mock('./components/Calendar', () => () => <div>Calendar screen</div>);
jest.mock('./components/DailyView', () => ({ __esModule: true, default: ({ schedule, onBack, viewControls }: any) => (
  <div>{viewControls}<div>Events {schedule.cycleName}</div>{onBack && <button onClick={onBack}>Calendar</button>}</div>
) }));

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
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
