import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import {
  APP_OPEN_AD_COOLDOWN_MS,
  getAppOpenAdId,
  isAppOpenAdEligible,
  resetAppOpenAdCooldown,
  showAppOpenAdIfEligible
} from './appOpen';

jest.mock('@capacitor/core', () => ({ Capacitor: {
  isNativePlatform: () => true, isPluginAvailable: () => true, getPlatform: () => 'android'
} }));
jest.mock('../../components/AdMobBanner', () => ({ initializeAdMob: async () => undefined }));
jest.mock('@capacitor-community/admob', () => ({ AdMob: {
  loadAppOpen: async () => undefined, isAppOpenLoaded: async () => ({ value: true }),
  showAppOpen: async () => undefined
} }));

beforeEach(() => { jest.restoreAllMocks(); localStorage.clear(); resetAppOpenAdCooldown(); });

describe('App Open ad policy and cadence', () => {
  const now = 1_700_000_000_000;

  it('allows an ad on the first eligible app open', () => {
    expect(isAppOpenAdEligible(0, now)).toBe(true);
  });

  it('recovers from invalid timestamps and a device clock moved backwards', () => {
    expect(isAppOpenAdEligible(NaN, now)).toBe(true);
    expect(isAppOpenAdEligible(now + 1000, now)).toBe(true);
  });

  it('loads and shows only once for simultaneous requests, then observes the in-memory cooldown', async () => {
    const load = jest.spyOn(AdMob, 'loadAppOpen');
    const show = jest.spyOn(AdMob, 'showAppOpen');
    expect(await Promise.all([showAppOpenAdIfEligible(), showAppOpenAdIfEligible()])).toEqual([true, true]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledTimes(1);
    expect(await showAppOpenAdIfEligible()).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not consume cooldown on load failure and permits a later attempt', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(AdMob, 'loadAppOpen').mockRejectedValueOnce(new Error('no-fill'));
    expect(await showAppOpenAdIfEligible()).toBe(false);
    expect(await showAppOpenAdIfEligible()).toBe(true);
  });

  it('never loads native ads on the web', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const load = jest.spyOn(AdMob, 'loadAppOpen');
    expect(await showAppOpenAdIfEligible()).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('waits 30 minutes after an ad is closed while the app remains open', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(await showAppOpenAdIfEligible()).toBe(true);
    expect(await showAppOpenAdIfEligible()).toBe(false);

    clock.mockReturnValue(now + APP_OPEN_AD_COOLDOWN_MS - 1);
    expect(isAppOpenAdEligible(now, Date.now())).toBe(false);
    expect(await showAppOpenAdIfEligible()).toBe(false);

    clock.mockReturnValue(now + APP_OPEN_AD_COOLDOWN_MS);
    expect(isAppOpenAdEligible(now, Date.now())).toBe(true);
    expect(await showAppOpenAdIfEligible()).toBe(true);
  });

  it('clears the foreground cooldown when the app is backgrounded so resume can show immediately', async () => {
    expect(await showAppOpenAdIfEligible()).toBe(true);
    expect(await showAppOpenAdIfEligible()).toBe(false);

    resetAppOpenAdCooldown();

    expect(await showAppOpenAdIfEligible()).toBe(true);
  });

  it('does not persist App Open cooldown across app launches', async () => {
    expect(await showAppOpenAdIfEligible()).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('waits 30 minutes between App Open ads', () => {
    expect(isAppOpenAdEligible(now - APP_OPEN_AD_COOLDOWN_MS + 1, now)).toBe(false);
    expect(isAppOpenAdEligible(now - APP_OPEN_AD_COOLDOWN_MS, now)).toBe(true);
  });

  it('uses platform-specific Google demo units in test mode', () => {
    expect(getAppOpenAdId(true, 'ios')).toBe('ca-app-pub-3940256099942544/5575463023');
    expect(getAppOpenAdId(true, 'android')).toBe('ca-app-pub-3940256099942544/9257395921');
  });

  it('uses the matching production unit for each native platform', () => {
    expect(getAppOpenAdId(false, 'android', 'production')).toBe('ca-app-pub-1251095758735054/8496510995');
    expect(getAppOpenAdId(false, 'ios', 'production')).toBe('ca-app-pub-1251095758735054/8739044413');
  });
});
