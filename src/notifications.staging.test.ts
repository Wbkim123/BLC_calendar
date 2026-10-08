import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import { selectStagingSession } from './staging';
import { createAdminSession, getAdminIdToken, sendScheduleNotification, enableNotifications } from './notifications';
import { getNotificationAvailability } from './notifications';
import { Capacitor } from '@capacitor/core';

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
jest.mock('./firebase', () => ({ app: {}, auth: {}, functions: {}, useFirebaseEmulators: false }));
jest.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
jest.mock('firebase/messaging', () => ({}));
jest.mock('firebase/auth', () => ({ getAuth: () => ({}), signInWithCustomToken: async () => undefined }));
jest.mock('firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => async () => undefined }));
jest.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: {
  deleteToken: async () => undefined,
  getToken: async () => ({ token: 'synthetic-native-token-for-tests' }),
  checkPermissions: async () => ({ receive: 'granted' }),
  requestPermissions: async () => ({ receive: 'granted' })
} }));

const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const reply = (body: unknown, ok = true) => ({ ok, json: async () => body } as Response);
beforeEach(() => {
  localStorage.clear();
  selectStagingSession(true);
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterEach(() => { global.fetch = originalFetch; selectStagingSession(false); jest.restoreAllMocks(); });

test('test login uses only staging login and token exchange, with separate token storage', async () => {
  localStorage.setItem('blc_admin_id_token', 'production-token-placeholder');
  fetchMock.mockResolvedValueOnce(reply({ result: { token: 'custom-placeholder', testMode: true, scope: 'NCOA' } }))
    .mockResolvedValueOnce(reply({ idToken: 'staging-id-placeholder', refreshToken: 'staging-refresh-placeholder' }));
  await createAdminSession('synthetic-login-fixture');
  expect(String(fetchMock.mock.calls[0][0])).toContain('us-central1-ncoa-calendar-staging.cloudfunctions.net/createAdminSession');
  expect(String(fetchMock.mock.calls[1][0])).toContain('identitytoolkit.googleapis.com');
  expect(localStorage.getItem('staging_blc_admin_id_token')).toBe('staging-id-placeholder');
  expect(localStorage.getItem('blc_admin_id_token')).toBe('production-token-placeholder');
});

test('failed staging authentication does not retry production', async () => {
  fetchMock.mockResolvedValueOnce(reply({ error: { message: 'unavailable' } }, false));
  await expect(createAdminSession('synthetic-login-fixture')).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toContain('ncoa-calendar-staging');
});

test('staging cannot reuse a stored production ID token', async () => {
  localStorage.setItem('blc_admin_id_token', 'production-token-placeholder');
  expect(await getAdminIdToken()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('audience send in staging is rerouted to device-only staging endpoint', async () => {
  localStorage.setItem('staging_blc_admin_id_token', 'staging-id-placeholder');
  fetchMock.mockResolvedValueOnce(reply({ result: { sent: true } }));
  await sendScheduleNotification({ academy: 'KTA', date: '2026-09-28', targetId: 'event-1',
    changeType: 'location', changedFields: ['location'], recipients: { sgl: true, students: true } });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toContain('ncoa-calendar-staging.cloudfunctions.net/sendTestScheduleNotification');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.data.token).toBe('synthetic-native-token-for-tests');
});

test('enabling staging notifications never subscribes to a production audience', async () => {
  localStorage.setItem('staging_blc_admin_id_token', 'staging-id-placeholder');
  fetchMock.mockResolvedValueOnce(reply({ result: { sent: true } }));
  await enableNotifications('ADMIN', null, true, 'BLC');
  expect(String(fetchMock.mock.calls[0][0])).toContain('ncoa-calendar-staging.cloudfunctions.net/registerPushToken');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.data.role).toBeUndefined();
  expect(body.data.topic).toBeUndefined();
  expect(localStorage.getItem('staging_push_ready')).toBe('true');
});

const fixtureToken = (claims: object) => `fixture.${window.btoa(JSON.stringify(claims))}.signature`;
test.each(['android', 'ios'])('%s renews a remembered Chief session with obsolete claims before writes', async platform => {
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform);
  selectStagingSession(false);
  localStorage.setItem('blc_calendar_login', JSON.stringify({ code: 'synthetic-chief-login', profile: { accessLevel: 'SCHEDULE_IMPORTER', academy: 'BLC' } }));
  localStorage.setItem('blc_admin_id_token', fixtureToken({ admin: true, scope: 'NCOA' }));
  const renewed = fixtureToken({ admin: true, scope: 'BLC' });
  fetchMock.mockResolvedValueOnce(reply({ result: { token: 'custom-fixture', scope: 'BLC' } }))
    .mockResolvedValueOnce(reply({ idToken: renewed, refreshToken: 'refresh-fixture' }));
  expect(await getAdminIdToken()).toBe(renewed);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('a valid native Chief token is not reauthenticated', async () => {
  selectStagingSession(false);
  localStorage.setItem('blc_calendar_login', JSON.stringify({ code: 'synthetic-chief-login', profile: { accessLevel: 'SCHEDULE_IMPORTER', academy: 'KTA' } }));
  const token = fixtureToken({ admin: true, scope: 'KTA' });
  localStorage.setItem('blc_admin_id_token', token);
  expect(await getAdminIdToken()).toBe(token);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('reauthentication cannot accept a token for a different academy', async () => {
  selectStagingSession(false);
  localStorage.setItem('blc_calendar_login', JSON.stringify({ code: 'synthetic-chief-login', profile: { accessLevel: 'SCHEDULE_IMPORTER', academy: 'BLC' } }));
  fetchMock.mockResolvedValueOnce(reply({ result: { token: 'custom-fixture' } }))
    .mockResolvedValueOnce(reply({ idToken: fixtureToken({ admin: true, scope: 'KTA' }) }));
  await expect(getAdminIdToken()).rejects.toThrow('permission-denied');
});

test('OS permission alone does not report native push registration success', async () => {
  selectStagingSession(false);
  expect(await getNotificationAvailability()).toBe('prompt');
  fetchMock.mockResolvedValueOnce(reply({ error: { message: 'temporarily unavailable', status: 'UNAVAILABLE' } }, false));
  await expect(enableNotifications('ADMIN', null, false, 'BLC')).rejects.toMatchObject({ code: 'unavailable' });
  expect(await getNotificationAvailability()).toBe('prompt');
  fetchMock.mockResolvedValueOnce(reply({ result: { subscribed: true, topic: 'audience-blc-admin' } }));
  await enableNotifications('ADMIN', null, false, 'BLC');
  expect(await getNotificationAvailability()).toBe('granted');
});

test('logout during native login cannot persist late authentication tokens', async () => {
  fetchMock.mockResolvedValueOnce(reply({ result: { token: 'custom-fixture', testMode: true, scope: 'NCOA' } }));
  fetchMock.mockImplementationOnce(async () => {
    selectStagingSession(false);
    return reply({ idToken: 'stale-fixture', refreshToken: 'stale-refresh' });
  });
  await expect(createAdminSession('synthetic-fixture')).rejects.toThrow('Session changed.');
  expect(localStorage.getItem('blc_admin_id_token')).toBeNull();
  expect(localStorage.getItem('staging_blc_admin_id_token')).toBeNull();
});
