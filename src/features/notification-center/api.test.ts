import { beforeEach, expect, jest, test } from '@jest/globals';
import { fetchHistoryPage, setHistoryCredential } from './api';
import { getAdminIdToken } from '../../notifications';
import { AccessProfile } from '../../types/academy';

let mockStaging = false;
jest.mock('../../firebase', () => ({ app: { options: { projectId: 'demo-notification-history' } }, useFirebaseEmulators: false }));
jest.mock('../../notifications', () => ({ getAdminIdToken: require('@jest/globals').jest.fn() }));
jest.mock('../../staging', () => ({ isStagingSession: () => mockStaging }));
const profile: AccessProfile = { role: 'VIEWER', accessLevel: 'SENIOR', academy: 'BLC', scope: 'BLC', permissions: ['schedule.read'] };
const signal = () => new AbortController().signal;
beforeEach(() => {
  window.localStorage.clear();
  setHistoryCredential(null);
  mockStaging = false;
  jest.mocked(getAdminIdToken).mockReset();
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ result: { items: [], nextCursor: null } }) })) as unknown as typeof fetch;
});
test('non-remembered read-only login works without borrowing a previous administrator token', async () => {
  setHistoryCredential('fixture-read-only');
  await fetchHistoryPage(profile, null, signal());
  expect(getAdminIdToken).not.toHaveBeenCalled();
  const options = jest.mocked(fetch).mock.calls[0][1]!;
  expect(options.headers).not.toHaveProperty('Authorization');
  expect(JSON.parse(String(options.body)).data).toEqual({ academy: 'BLC', code: 'fixture-read-only', cursor: null });
});
test('signed staff queries never send access credentials or a caller-specified role/cycle', async () => {
  jest.mocked(getAdminIdToken).mockResolvedValue('fixture-token');
  setHistoryCredential('fixture-ignored');
  await fetchHistoryPage({ ...profile, accessLevel: 'NCOA_MANAGER' }, null, signal());
  const options = jest.mocked(fetch).mock.calls[0][1]!;
  expect(options.headers).toHaveProperty('Authorization', 'Bearer fixture-token');
  expect(JSON.parse(String(options.body)).data).toEqual({ academy: 'BLC', cursor: null });
});

test('aborting stalled auth ends the request and late auth cannot send history HTTP', async () => {
  let finish!: (value: string) => void;
  jest.mocked(getAdminIdToken).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const controller = new AbortController();
  const pending = fetchHistoryPage({ ...profile, accessLevel: 'NCOA_MANAGER' }, null, controller.signal);
  const rejected = expect(pending).rejects.toHaveProperty('name', 'AbortError');
  controller.abort();
  await rejected;
  finish('fixture-late-token');
  await Promise.resolve();
  expect(fetch).not.toHaveBeenCalled();
  jest.mocked(getAdminIdToken).mockResolvedValue('fixture-retry-token');
  await fetchHistoryPage({ ...profile, accessLevel: 'NCOA_MANAGER' }, null, signal());
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('already cancelled history requests do not start auth or HTTP', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(fetchHistoryPage({ ...profile, accessLevel: 'NCOA_MANAGER' }, null, controller.signal))
    .rejects.toHaveProperty('name', 'AbortError');
  expect(getAdminIdToken).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
test('missing or cleared credentials fail without an HTTP request; remembered login is restored', async () => {
  await expect(fetchHistoryPage(profile, null, signal())).rejects.toThrow('sign in again');
  expect(fetch).not.toHaveBeenCalled();
  window.localStorage.setItem('blc_calendar_login', JSON.stringify({ code: 'fixture-saved' }));
  await fetchHistoryPage(profile, null, signal());
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('staging cannot query production history and server errors are not exposed verbatim', async () => {
  mockStaging = true;
  await expect(fetchHistoryPage(profile, null, signal())).rejects.toThrow('test mode');
  expect(fetch).not.toHaveBeenCalled();
  mockStaging = false;
  setHistoryCredential('fixture-read-only');
  jest.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: { message: 'private-server-details' } }) } as Response);
  await expect(fetchHistoryPage(profile, null, signal())).rejects.toThrow('Notification history is unavailable. Please try again.');
});
