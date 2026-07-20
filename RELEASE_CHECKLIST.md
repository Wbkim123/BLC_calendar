# App Store Release Checklist

Complete these AdMob items before submitting the production iOS build:

- Register the iOS app in the AdMob console using the final App Store bundle ID.
- Replace the sample `GADApplicationIdentifier` in `ios/App/App/Info.plist` with the production iOS AdMob App ID.
- Replace `IOS_TEST_BANNER_AD_ID` in `src/components/AdMobBanner.tsx` with the production iOS Banner Ad Unit ID.
- Confirm the production banner is configured for iOS; do not reuse the Android banner unit ID.
- Test consent flow and banner placement on a TestFlight build before App Store submission.
- Remove any on-screen AdMob diagnostics before release.

The current iOS App ID and banner unit are Google demo/test identifiers and must not ship to production.
