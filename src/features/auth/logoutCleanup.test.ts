import { afterEach, expect, it, jest } from '@jest/globals';
import { waitForLogoutCleanup } from './logoutCleanup';

afterEach(() => { jest.useRealTimers(); });

it('bounds a stalled cleanup without allowing a new login to bypass it', async () => {
  jest.useFakeTimers();
  let finish!: () => void;
  const cleanup = new Promise<void>(resolve => { finish = resolve; });
  const first = expect(waitForLogoutCleanup(cleanup)).rejects.toThrow('still pending');
  jest.advanceTimersByTime(20000);
  await first;
  const second = expect(waitForLogoutCleanup(cleanup)).rejects.toThrow('still pending');
  jest.advanceTimersByTime(20000);
  await second;
  finish();
  await expect(waitForLogoutCleanup(cleanup)).resolves.toBeUndefined();
  expect(jest.getTimerCount()).toBe(0);
});
