import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { initializeAdMob } from '../../components/AdMobBanner';

export const STUDENT_INTERSTITIAL_RETURN_THRESHOLD = 3;
export const STUDENT_INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

const RETURN_COUNT_KEY = 'ncoa_student_interstitial_return_count';
const LAST_SHOWN_KEY = 'ncoa_student_interstitial_last_shown';
const GOOGLE_ANDROID_TEST_ID = 'ca-app-pub-3940256099942544/1033173712';
const GOOGLE_IOS_TEST_ID = 'ca-app-pub-3940256099942544/4411468910';
const ANDROID_PRODUCTION_ID = process.env.REACT_APP_ANDROID_INTERSTITIAL_AD_ID || '';
const IOS_PRODUCTION_ID = process.env.REACT_APP_IOS_INTERSTITIAL_AD_ID || '';

let preparePromise: Promise<boolean> | null = null;
let isPrepared = false;
let isShowing = false;

export const isStudentInterstitialEligible = (
  returnCount: number,
  lastShownAt: number,
  now = Date.now()
) => returnCount >= STUDENT_INTERSTITIAL_RETURN_THRESHOLD
  && now - lastShownAt >= STUDENT_INTERSTITIAL_COOLDOWN_MS;

const getAdId = (testMode: boolean) => {
  const isIos = Capacitor.getPlatform() === 'ios';
  if (testMode) return isIos ? GOOGLE_IOS_TEST_ID : GOOGLE_ANDROID_TEST_ID;
  return isIos ? IOS_PRODUCTION_ID : ANDROID_PRODUCTION_ID;
};

const canUseInterstitial = () => Capacitor.isNativePlatform()
  && Capacitor.isPluginAvailable('AdMob');

export const prepareStudentInterstitial = async (testMode = false) => {
  if (!canUseInterstitial()) return false;
  if (isPrepared) return true;

  const adId = getAdId(testMode);
  // Production remains intentionally disabled until both real AdMob unit IDs
  // are supplied through the release environment.
  if (!adId) return false;

  if (!preparePromise) {
    preparePromise = initializeAdMob()
      .then(() => AdMob.prepareInterstitial({ adId, isTesting: testMode }))
      .then(() => {
        isPrepared = true;
        return true;
      })
      .catch(error => {
        console.error('Failed to prepare student interstitial:', error);
        return false;
      })
      .finally(() => {
        preparePromise = null;
      });
  }

  return preparePromise;
};

export const recordStudentCalendarReturnAndMaybeShow = async (testMode = false) => {
  if (!canUseInterstitial() || isShowing) return false;

  const returnCount = Number(window.localStorage.getItem(RETURN_COUNT_KEY) || 0) + 1;
  const lastShownAt = Number(window.localStorage.getItem(LAST_SHOWN_KEY) || 0);
  window.localStorage.setItem(RETURN_COUNT_KEY, String(returnCount));

  if (!isStudentInterstitialEligible(returnCount, lastShownAt) || !isPrepared) {
    void prepareStudentInterstitial(testMode);
    return false;
  }

  isShowing = true;
  try {
    await AdMob.showInterstitial();
    window.localStorage.setItem(RETURN_COUNT_KEY, '0');
    window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
    return true;
  } catch (error) {
    console.error('Failed to show student interstitial:', error);
    return false;
  } finally {
    isPrepared = false;
    isShowing = false;
    void prepareStudentInterstitial(testMode);
  }
};
