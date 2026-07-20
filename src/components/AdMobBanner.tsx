import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const ANDROID_BANNER_AD_ID = 'ca-app-pub-1251095758735054/6937828493';
const IOS_TEST_BANNER_AD_ID = 'ca-app-pub-3940256099942544/2435281174';
const BANNER_RESERVED_HEIGHT = 'calc(6rem + env(safe-area-inset-bottom))';
const NATIVE_BANNER_RESERVED_HEIGHT = 'calc(3.125rem + env(safe-area-inset-bottom))';

let initializePromise: Promise<void> | null = null;
let showBannerPromise: Promise<void> | null = null;
let isBannerHidden = false;

const initializeAdMob = () => {
  if (!initializePromise) {
    initializePromise = AdMob.initialize().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
};

const getSafeAreaBottom = () => {
  if (Capacitor.getPlatform() !== 'ios') return 0;

  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'left:0',
    'bottom:0',
    'height:env(safe-area-inset-bottom)',
    'visibility:hidden',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(probe);
  const inset = Math.round(probe.getBoundingClientRect().height);
  probe.remove();
  return inset;
};

const showAdMobBanner = () => {
  const bannerAdId = Capacitor.getPlatform() === 'ios'
    ? IOS_TEST_BANNER_AD_ID
    : ANDROID_BANNER_AD_ID;

  if (!showBannerPromise) {
    showBannerPromise = initializeAdMob()
      .then(() => AdMob.showBanner({
        adId: bannerAdId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        // The iOS plugin anchors to safeAreaLayoutGuide. A negative margin
        // offsets that inset so the banner itself reaches the screen bottom.
        margin: -getSafeAreaBottom()
      }))
      .catch((error) => {
        showBannerPromise = null;
        throw error;
      });
  }

  return showBannerPromise.then(() => {
    if (isBannerHidden) {
      isBannerHidden = false;
      return AdMob.resumeBanner();
    }
  });
};

const hideAdMobBanner = () => {
  if (!showBannerPromise || isBannerHidden) return Promise.resolve();

  return showBannerPromise.then(() => {
    isBannerHidden = true;
    return AdMob.hideBanner();
  });
};

interface Props {
  visible?: boolean;
}

export default function AdMobBanner({ visible = true }: Props) {
  const isNative = Capacitor.isNativePlatform();
  const [nativeStatus, setNativeStatus] = useState<'loading' | 'loaded' | 'retrying'>('loading');

  useEffect(() => {
    if (!isNative || !Capacitor.isPluginAvailable('AdMob')) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let failedListener: PluginListenerHandle | undefined;
    let loadedListener: PluginListenerHandle | undefined;

    AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      console.info('AdMob banner loaded');
      setNativeStatus('loaded');
    }).then(handle => {
      if (cancelled) handle.remove();
      else loadedListener = handle;
    }).catch(error => console.error('Failed to attach AdMob loaded listener:', error));

    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
      console.error('AdMob banner failed to load:', error);
      setNativeStatus('retrying');
      if (cancelled || !visible || retryTimer !== undefined) return;

      showBannerPromise = null;
      isBannerHidden = false;
      AdMob.removeBanner().catch(() => undefined).finally(() => {
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined;
          if (!cancelled && visible) {
            setNativeStatus('loading');
            showAdMobBanner().catch(retryError => {
              console.error('Failed to retry AdMob banner:', retryError);
            });
          }
        }, 3000);
      });
    }).then(handle => {
      if (cancelled) handle.remove();
      else failedListener = handle;
    }).catch(error => console.error('Failed to attach AdMob failure listener:', error));

    const bannerAction = visible ? showAdMobBanner() : hideAdMobBanner();

    bannerAction
      .catch((error) => {
        console.error('Failed to update AdMob banner:', error);
      });

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      failedListener?.remove();
      loadedListener?.remove();
    };
  }, [isNative, visible]);

  return (
    <div
      aria-hidden="true"
      className={`admob-banner ${isNative ? `admob-banner-native pointer-events-none ${nativeStatus !== 'loaded' ? 'admob-banner-pending' : ''}` : 'border-t border-gray-200 bg-gray-50'} fixed inset-x-0 bottom-0 z-20 w-full ${visible ? '' : 'hidden'}`}
      style={{ minHeight: visible ? (isNative && nativeStatus !== 'loaded' ? NATIVE_BANNER_RESERVED_HEIGHT : !isNative ? BANNER_RESERVED_HEIGHT : 0) : 0 }}
    >
      {visible && !isNative && (
        <div className="h-16 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          AdMob Banner
        </div>
      )}
      {visible && isNative && nativeStatus !== 'loaded' && (
        <div className="flex h-[3.125rem] items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {nativeStatus === 'retrying' ? 'Test ad retrying…' : 'Loading test ad…'}
        </div>
      )}
    </div>
  );
}
