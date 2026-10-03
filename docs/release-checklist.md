# NCOA Web and App Release Checklist

No command in this checklist should be run until the release is explicitly approved.

## Local development and isolation

- `npm start` and `npm test` use the local Firebase Emulator Suite with the `demo-blc-calendar` project ID. Start emulators in another terminal with `npm run emulators`; the wrapper detects the Android Studio JBR if Java is not already on PATH.
- Run `npm run test:emulator` to run unit tests and verify a write/read/delete round trip against only the local Realtime Database emulator.
- Emulator data/rules are separate from production: use only `firebase.emulators.json` for local emulator commands. Never use the emulator rules file for a production deploy.
- Review the resulting diff and passing checks before any release. A production build fails if emulator mode or a `demo-*` project override is present. Production push/deployment remains a separately approved release action.

## Mobile test sessions and TV website

- Follow `docs/staging-setup.md` for the separately configured remote staging environment. Native test sessions now use the staging project in local source; the previous production read-only behavior is superseded only after the new backend and app are released.
- Deploy staging Functions/Rules with the explicit staging project/config, provision its login secret, and separately deploy ONLY the approved production push relay. Do not include unrelated pending production backend changes. Every external action requires explicit user authorization.
- The relay defaults to rejecting all devices. Approve only the fingerprint from the user's physical test phone, then verify welcome and schedule-change push receipt. FCM token rotation requires reapproval. Keep the existing native messaging configuration and app/bundle ID.
- Native builds and the Cloudflare TV website are separate artifacts. Production TV continues reading production schedules. No TV website deployment is required for staging.
- Populate staging through confirmed PDF imports or an approved one-time copy of schedule/location/uniform data only. Do not automatically synchronize writes between projects.
- Verify app login restoration, logout, academy switching, failed staging connectivity, and notification navigation do not mix environments. Verify existing production users remain unchanged. Old installed app versions retain their existing backend behavior until separately released protections apply.

## 1. Decisions before the release

- Keep the existing application ID and bundle ID: `dev.pages.blccalendar`.
- The requested store/display name is **NCOA Schedule Calendar**. Update the App Store Connect product name and Google Play main store listing title manually; this repository change updates the installed app label only.
- Use the selected neutral calendar icon in `assets/icon.png`; generated platform assets must be reviewed before submitting the store build. Google Play's 512×512 store listing icon must also be uploaded in Play Console.
- The app-open ad flow runs on native iOS/Android for all access roles, at most once per
  hour while opening or returning to the app. It does not run on Web/TV. Create separate
  AdMob App Open units for Android and iOS and set `REACT_APP_ANDROID_APP_OPEN_AD_ID`
  and `REACT_APP_IOS_APP_OPEN_AD_ID` in the native build environment. Until these IDs
  are configured, production app-open ads remain disabled; development uses Google's
  demo ad units.
- Download the Android Firebase configuration to `android/app/google-services.json` if Android push notifications are required.

## 2. Backend prerequisite for KTA

KTA administrator writes require the pending Realtime Database rules and authentication functions. Deploy these before exposing KTA import/editing in production:

```powershell
firebase deploy --only functions,database
```

After deployment, verify BLC, KTA, and NCOA administrator codes separately. Do not deploy from an unreviewed working tree.

## 3. Verify the release candidate

```powershell
npm ci
npm run release:verify
```

The existing AdMob package source-map messages are warnings; test or TypeScript failures are release blockers.

Manual checks:

- BLC login sees only BLC schedules and BLC search results.
- KTA login sees only KTA schedules and KTA search results.
- Student login sees only its assigned cycle and cannot select **All Cycles**.
- On a physical native device, verify app-open ads can appear for each access role on
  initial entry and app foreground, with a one-hour cooldown; a failed ad never blocks
  app use. Verify no ads appear on Web/TV.
- NCOA manager can switch academies, but search remains limited to the selected academy.
- Search result opens the correct date and highlights the selected event.
- KTA PDF import preview is checked before Confirm Import.
- Day-label editing changes only the selected date.
- Web does not show a fake AdMob placeholder if that planned change is included.

## 4. Web release first

1. Deploy backend prerequisites from section 2.
2. Publish the Web build through the configured Cloudflare Pages workflow.
3. Perform the manual checks against the production URL.
4. Keep the app-store releases paused until the production Web/backend behavior is confirmed.

## 5. Prepare native projects

After the Web release candidate is approved:

```powershell
npm run native:sync
```

This copies the same tested Web build into both native projects and updates Capacitor plugins.

## 6. Android release

- Current release candidate: `4.0.8` (`versionCode 11`). The prior store build was
  `4.0.7` (`versionCode 10`).
- Build an Android App Bundle (`.aab`), not only an APK.
- Confirm Play App Signing/upload-key configuration in Android Studio.
- Smoke-test login, Firebase reads, search, KTA/BLC separation, AdMob, and notifications on a physical Android device.

Example build after the version is approved:

```powershell
cd android
./gradlew bundleRelease
```

## 7. iOS release

- Marketing version for the next App Store release: `2.0` (configured in the iOS Xcode project).
- Codemagic supplies the build number using `BUILD_NUMBER`; keep it separate from the marketing version and do not manually reset it.
- Smoke-test login, search, KTA/BLC separation, AdMob consent/banner behavior, and notifications on a physical iPhone.
- Run Codemagic only after the reviewed changes are intentionally pushed.

## 8. Store rollout

- Update the App Store Connect product name and Google Play main store listing title to
  **NCOA Schedule Calendar**. Upload the 512×512 store listing icon to Google Play; the
  platform app icons are already generated from `assets/icon.png` for the new build.
- Update release notes to mention schedule viewing and search.
- Use a staged rollout on Google Play when available.
- Monitor Firebase Functions logs, database permission failures, crashes, AdMob delivery, and user reports after release.
- Do not delete or overwrite previous cycle data during rollout verification.
