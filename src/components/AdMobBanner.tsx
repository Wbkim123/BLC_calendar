import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const BANNER_AD_ID = 'ca-app-pub-1251095758735054/6937828493';
const BANNER_HEIGHT_PX = 64;

let initializePromise: Promise<void> | null = null;
let showBannerPromise: Promise<void> | null = null;
let isBannerHidden = false;

const initializeAdMob = () => {
  if (!initializePromise) {
    initializePromise = AdMob.initialize();
  }

  return initializePromise;
};

const showAdMobBanner = () => {
  if (!showBannerPromise) {
    showBannerPromise = initializeAdMob()
      .then(() => AdMob.showBanner({
        adId: BANNER_AD_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER
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
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AdMob')) return;

    const bannerAction = visible ? showAdMobBanner() : hideAdMobBanner();

    bannerAction
      .catch((error) => {
        console.error('Failed to update AdMob banner:', error);
      });
  }, [visible]);

  return (
    <div
      aria-hidden="true"
      className={`shrink-0 w-full border-t border-gray-200 bg-gray-50 ${visible ? '' : 'hidden'}`}
      style={{ minHeight: visible ? BANNER_HEIGHT_PX : 0 }}
    >
      {visible && !Capacitor.isNativePlatform() && (
        <div className="h-16 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          AdMob Banner
        </div>
      )}
    </div>
  );
}
