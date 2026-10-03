import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { initializeAdMob } from '../../components/AdMobBanner';

export const APP_OPEN_AD_COOLDOWN_MS = 60 * 60 * 1000;
export const APP_OPEN_AD_LAST_SHOWN_KEY = 'ncoa_app_open_ad_last_shown';

const GOOGLE_ANDROID_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/9257395921';
const GOOGLE_IOS_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/5575463023';
const ANDROID_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8496510995';
const IOS_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8739044413';

let showPromise: Promise<boolean> | null = null;

export const isAppOpenAdEligible = (lastShownAt: number, now = Date.now()) =>
  lastShownAt <= 0 || now - lastShownAt >= APP_OPEN_AD_COOLDOWN_MS;

export const getAppOpenAdId = (
  testMode: boolean,
  platform = Capacitor.getPlatform(),
  environment = process.env.NODE_ENV
) => {
  if (testMode || environment !== 'production') {
    return platform === 'ios' ? GOOGLE_IOS_TEST_APP_OPEN_ID : GOOGLE_ANDROID_TEST_APP_OPEN_ID;
  }

  return platform === 'ios' ? IOS_APP_OPEN_AD_ID : ANDROID_APP_OPEN_AD_ID;
};

export const showAppOpenAdIfEligible = (testMode = false) => {
  if (showPromise) return showPromise;

  showPromise = (async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AdMob')) return false;

    const lastShownAt = Number(window.localStorage.getItem(APP_OPEN_AD_LAST_SHOWN_KEY) || 0);
    if (!isAppOpenAdEligible(lastShownAt)) return false;

    const adId = getAppOpenAdId(testMode);
    if (!adId) return false;

    await initializeAdMob();
    await AdMob.loadAppOpen({ adId });
    const { value: isLoaded } = await AdMob.isAppOpenLoaded();
    if (!isLoaded || document.visibilityState !== 'visible') return false;

    await AdMob.showAppOpen();
    window.localStorage.setItem(APP_OPEN_AD_LAST_SHOWN_KEY, String(Date.now()));
    return true;
  })().catch(error => {
    console.warn('App Open ad was skipped:', error);
    return false;
  }).finally(() => {
    showPromise = null;
  });

  return showPromise;
};
