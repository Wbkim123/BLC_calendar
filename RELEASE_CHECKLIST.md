# App Store Release Checklist

Complete these AdMob items before submitting the production iOS build:

- Register the iOS app in the AdMob console using the final App Store bundle ID.
- [x] Production iOS AdMob App ID is configured in `ios/App/App/Info.plist`.
- [x] Production iOS Banner Ad Unit ID is configured in `src/components/AdMobBanner.tsx`.
- Confirm the production banner is configured for iOS; do not reuse the Android banner unit ID.
- [x] Refresh UMP consent information before requesting ads and check `canRequestAds`.
- [x] Show an Ad Privacy Choices entry point in Settings when UMP reports it is required.
- [x] Publish the AdMob seller declaration from `public/app-ads.txt` at the site root.
- After the App Store release, link the published iOS listing in AdMob and wait for app readiness and app-ads.txt verification.
- Test consent flow and banner placement on a TestFlight build before App Store submission.
- Remove any on-screen AdMob diagnostics before release.
