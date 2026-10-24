import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { requestNativeDatabaseWrite } from './nativeWrite';
import { getAdminIdToken } from '../../notifications';

let mockGeneration = 0;
let mockStaging = false;
jest.mock('../../firebase', () => ({ getDatabaseRestUrl: (path: string, token: string) => `https://production.invalid/${path}?auth=${token}` }));
jest.mock('../../notifications', () => ({ getAdminIdToken: require('@jest/globals').jest.fn() }));
jest.mock('../../staging', () => ({
  getSessionGeneration: () => mockGeneration, isStagingSession: () => mockStaging,
  stagingDatabaseUrl: () => 'https://staging.invalid'
}));
const originalFetch = global.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const reply = (status: number) => ({ status, ok: status === 200 } as Response);
beforeEach(() => {
  jest.clearAllMocks(); mockGeneration = 0; mockStaging = false;
  fetchMock.mockReset(); global.fetch = fetchMock;
  jest.mocked(getAdminIdToken).mockReset().mockResolvedValue('fixture-token');
});
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('renews once after a rejected write and signals confirmation only after success', async () => {
  const confirmed = jest.fn();
  window.addEventListener('schedule-write-confirmed', confirmed);
  fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(200));
  try {
    await requestNativeDatabaseWrite('', 'PATCH', { 'schedules/day/events/0': { id: 'event' } });
    expect(getAdminIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getAdminIdToken).toHaveBeenNthCalledWith(2, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(fetchMock.mock.calls[1][1]?.body);
  } finally { window.removeEventListener('schedule-write-confirmed', confirmed); }
});

test('persistent permission denial stops after one renewal without reporting success', async () => {
  fetchMock.mockResolvedValue(reply(403));
  await expect(requestNativeDatabaseWrite('', 'PATCH', {})).rejects.toThrow('cannot edit this academy');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('session change during renewal prevents a write under the next login', async () => {
  jest.mocked(getAdminIdToken).mockImplementation(async () => { mockGeneration++; return 'next-session'; });
  await expect(requestNativeDatabaseWrite('', 'PATCH', {})).rejects.toThrow('Session changed');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('staging rejection never retries production authentication', async () => {
  mockStaging = true;
  fetchMock.mockResolvedValue(reply(403));
  await expect(requestNativeDatabaseWrite('', 'PATCH', {})).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('https://staging.invalid');
});

test('an ambiguous timeout is not retried and tells the user to check the schedule', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const result = requestNativeDatabaseWrite('', 'PATCH', {});
  const assertion = expect(result).rejects.toThrow('Could not confirm whether the change was saved');
  for (let step = 0; step < 5; step++) await Promise.resolve();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(15000);
  await assertion;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
