import { expect, jest, test } from '@jest/globals';
import { ensureStagingAuthPersistence, stagingAuth } from './staging';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';

jest.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
jest.mock('firebase/auth', () => ({
  browserLocalPersistence: { name: 'browser-local-persistence' },
  getAuth: () => ({}),
  setPersistence: require('@jest/globals').jest.fn(async () => undefined)
}));
jest.mock('firebase/functions', () => ({ getFunctions: () => ({}) }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

test('browser staging auth uses shared local persistence for the phone preview iframe', async () => {
  await ensureStagingAuthPersistence();
  expect(setPersistence).toHaveBeenCalledWith(stagingAuth, browserLocalPersistence);
});
