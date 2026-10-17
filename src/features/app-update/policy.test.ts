import { describe, expect, it } from '@jest/globals';
import { dismissalKey, isNewerVersion, parseRelease, REMIND_AFTER_MS, shouldRemind } from './policy';

describe('store update policy', () => {
  it('compares numeric versions without lexicographic mistakes or downgrade prompts', () => {
    expect(isNewerVersion('4.10.0', '4.9.9')).toBe(true);
    expect(isNewerVersion('2.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('2.0.1', '2.1.0')).toBe(false);
    expect(isNewerVersion('bad', '2.0')).toBe(false);
    expect(isNewerVersion('2.1', 'unknown')).toBe(false);
  });
  it('requires an explicitly enabled, valid newer release', () => {
    expect(parseRelease('{', '2.0')).toBeNull();
    expect(parseRelease('null', '2.0')).toBeNull();
    expect(parseRelease('{"latestVersion":"2.1"}', '2.0')).toBeNull();
    expect(parseRelease('{"enabled":false,"latestVersion":"2.1"}', '2.0')).toBeNull();
    expect(parseRelease('{"enabled":true,"latestVersion":"2.0"}', '2.0')).toBeNull();
    expect(parseRelease('{"enabled":true,"latestVersion":"2.1","notes":"New features"}', '2.0')).toEqual({ latestVersion: '2.1', notes: 'New features' });
  });
  it('snoozes for 24 hours and separates platforms and releases', () => {
    const dismissedAt = 100000;
    expect(shouldRemind(dismissedAt, dismissedAt + REMIND_AFTER_MS - 1)).toBe(false);
    expect(shouldRemind(dismissedAt, dismissedAt + REMIND_AFTER_MS)).toBe(true);
    expect(shouldRemind(0, dismissedAt)).toBe(true);
    expect(dismissalKey('ios', '2.1')).not.toBe(dismissalKey('android', '2.1'));
    expect(dismissalKey('ios', '2.1')).not.toBe(dismissalKey('ios', '2.2'));
  });
});
