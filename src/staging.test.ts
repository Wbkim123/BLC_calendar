import { Capacitor } from '@capacitor/core';
import { jest, test, beforeEach, afterEach, expect } from '@jest/globals';
import { isStagingSession, selectStagingSession, stagingDatabaseUrl, getSessionGeneration } from './staging';

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: require('@jest/globals').jest.fn(() => true) } }));
beforeEach(() => { jest.mocked(Capacitor.isNativePlatform).mockReturnValue(true); });
afterEach(() => { jest.mocked(Capacitor.isNativePlatform).mockReturnValue(true); selectStagingSession(false); });
test('can route a browser test session to the isolated staging project', () => {
  jest.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  selectStagingSession(true);
  expect(isStagingSession()).toBe(true);
});
test('pins authenticated requests to the staging host for both academies', () => {
  for (const path of ['schedules', '/academies/kta/schedules/']) {
    const url = new URL(stagingDatabaseUrl(path, 'synthetic-token'));
    expect(url.host).toBe('ncoa-calendar-staging-default-rtdb.firebaseio.com');
    expect(url.searchParams.get('auth')).toBe('synthetic-token');
    expect(url.pathname).toContain(path.includes('kta') ? '/academies/kta/' : '/schedules');
  }
  expect(() => stagingDatabaseUrl('schedules', '')).toThrow(/authentication/);
});
test('invalidates pending authentication work across session changes', () => {
  const before = getSessionGeneration();
  selectStagingSession(true);
  expect(isStagingSession()).toBe(true);
  expect(getSessionGeneration()).toBeGreaterThan(before);
});
