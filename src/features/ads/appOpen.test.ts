import { describe, expect, it } from '@jest/globals';
import {
  APP_OPEN_AD_COOLDOWN_MS,
  getAppOpenAdId,
  isAppOpenAdEligible
} from './appOpen';

describe('App Open ad policy and cadence', () => {
  const now = 1_700_000_000_000;

  it('allows an ad on the first eligible app open', () => {
    expect(isAppOpenAdEligible(0, now)).toBe(true);
  });

  it('waits one hour between App Open ads', () => {
    expect(isAppOpenAdEligible(now - APP_OPEN_AD_COOLDOWN_MS + 1, now)).toBe(false);
    expect(isAppOpenAdEligible(now - APP_OPEN_AD_COOLDOWN_MS, now)).toBe(true);
  });

  it('uses platform-specific Google demo units in test mode', () => {
    expect(getAppOpenAdId(true, 'ios')).toBe('ca-app-pub-3940256099942544/5575463023');
    expect(getAppOpenAdId(true, 'android')).toBe('ca-app-pub-3940256099942544/9257395921');
  });
});
