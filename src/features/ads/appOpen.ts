import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { initializeAdMob } from '../../components/AdMobBanner';

export const APP_OPEN_AD_COOLDOWN_MS = 30 * 60 * 1000;
const LAST_CLOSED_KEY = 'ncoa-app-open-ad-last-closed-at';

const GOOGLE_ANDROID_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/9257395921';
const GOOGLE_IOS_TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/5575463023';
const ANDROID_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8496510995';
const IOS_APP_OPEN_AD_ID = 'ca-app-pub-1251095758735054/8739044413';

let showPromise: Promise<boolean> | null = null;
let lastClosedAt = 0;
let storageWriteFailed = false;
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

const readLastClosedAt = () => {
  if (storageWriteFailed) return lastClosedAt;
  try {
    return Number(localStorage.getItem(LAST_CLOSED_KEY));
  } catch {
    return lastClosedAt;
  }
};

export const showAppOpenAdIfEligible = (testMode = false, isResume = false) => {
  if (showPromise) {
    if (isResume && document.visibilityState === 'visible' && !appOpenAdShowing) resumePending = true;
    return showPromise;
  }

  showPromise = (async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AdMob')) return false;

    if (!isAppOpenAdEligible(readLastClosedAt())) return false;
    if (document.querySelector('[data-feature-tour]')) return false;

    const adId = getAppOpenAdId(testMode);
    if (!adId) return false;

    await initializeAdMob();
    await AdMob.loadAppOpen({ adId });
    const { value: isLoaded } = await AdMob.isAppOpenLoaded();
    if (!isLoaded || document.visibilityState !== 'visible' || document.querySelector('[data-feature-tour]')) return false;

    appOpenAdShowing = true;
    try {
      await AdMob.showAppOpen();
      lastClosedAt = Date.now();
      try {
        localStorage.setItem(LAST_CLOSED_KEY, String(lastClosedAt));
        storageWriteFailed = false;
      } catch {
        storageWriteFailed = true;
        // Keep the in-memory cooldown if device storage is unavailable.
      }
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
