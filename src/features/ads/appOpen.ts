import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { initializeAdMob } from '../../components/AdMobBanner';

export const APP_OPEN_AD_COOLDOWN_MS = 30 * 60 * 1000;

const GOOGLE_ANDROID_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/9257395921';
const GOOGLE_IOS_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/5575463023';
const ANDROID_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8496510995';
const IOS_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8739044413';

let showPromise: Promise<boolean> | null = null;
let lastClosedAt = 0;
let appOpenAdShowing = false;
let resumePending = false;

export const isAppOpenAdEligible = (lastShownAt: number, now = Date.now()) =>
  !Number.isFinite(lastShownAt) || lastShownAt <= 0 || lastShownAt > now || now - lastShownAt >= APP_OPEN_AD_COOLDOWN_MS;

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

export const isAppOpenAdShowing = () => appOpenAdShowing;

/** Reset the in-memory close cooldown when the user backgrounds the app. */
export const resetAppOpenAdCooldown = () => {
  if (!appOpenAdShowing) lastClosedAt = 0;
};

export const showAppOpenAdIfEligible = (testMode = false, isResume = false) => {
  if (showPromise) {
    if (isResume && document.visibilityState === 'visible' && !appOpenAdShowing) resumePending = true;
    return showPromise;
  }

  showPromise = (async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AdMob')) return false;

    if (!isAppOpenAdEligible(lastClosedAt)) return false;

    const adId = getAppOpenAdId(testMode);
    if (!adId) return false;

    await initializeAdMob();
    await AdMob.loadAppOpen({ adId });
    const { value: isLoaded } = await AdMob.isAppOpenLoaded();
    if (!isLoaded || document.visibilityState !== 'visible') return false;

    appOpenAdShowing = true;
    try {
      await AdMob.showAppOpen();
      lastClosedAt = Date.now();
    } finally {
      appOpenAdShowing = false;
    }
    return true;
  })().catch(error => {
    console.warn('App Open ad was skipped:', error);
    return false;
  }).finally(() => {
    showPromise = null;
    if (resumePending) {
      resumePending = false;
      if (document.visibilityState === 'visible') {
        window.setTimeout(() => void showAppOpenAdIfEligible(testMode), 0);
      }
    }
  });

  return showPromise;
};
