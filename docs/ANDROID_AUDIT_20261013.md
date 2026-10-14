## Android Firebase setup completed (2026-10-14)

- User explicitly authorized Android registration and config download. Registered Android app in blc-calendar-e302f with existing package dev.pages.blccalendar; Firebase nickname Academy Calendar Android (does not rename the store app).
- Added android/app/google-services.json in active repair worktree E:/NCOA/BLC/blc_calendar/release-assets/mobile-audit-20261013. Validated project/package and generated google_app_id. Earlier audit's pending-registration blocker is resolved.
- Restored minSdkVersion 24, matching Capacitor 8 and preserved original local setting. Kept versionCode 11 pending checking highest uploaded Play version; do not release with a previously used code.
- Capacitor Android sync, processDebugGoogleServices, and assembleDebug passed. Initial debug signing failed because D:/Android/.android was not writable; succeeded using ANDROID_USER_HOME inside ignored android/build/debug-user with --no-daemon. No release/upload signing keys were used or changed.
- Debug APK: android/app/build/outputs/apk/debug/app-debug.apk. No device install or live push receipt was verified. Prior 26 suites / 109 tests, TypeScript and web build checks remain valid; this continuation changed native configuration only.
- Detailed Korean next-step guide: docs/ANDROID_UPDATE_STEPS_20261014.md in the active repair worktree. Use that worktree for new builds, check Play version code, generate signed AAB with existing upload key, distribute via internal testing, verify on phones, then submit production.
- No GitHub push, Firebase Functions/Rules deploy, signed release build or store submission performed. External change this turn was only the explicitly authorized Firebase Android app registration.

---

# Android audit — 2026-10-13

## Working copy and authorization

- Active repair worktree: `E:/NCOA/BLC/blc_calendar/release-assets/mobile-audit-20261013`, branch `fix/android-audit-20261013`, base `13231784a5a374d399d0c43aa791b91030e02f15`.
- Original worktree remains intentionally dirty. The previous temporary release worktree has many missing tracked files; its remaining changes were preserved, not reset or restored over. Do not use it for builds without recovery and review.
- Current work is local and uncommitted. No new GitHub push, Firebase deployment, Cloudflare deployment, native release build, store submission, production schedule write, or push send was performed.
- User was asked to authorize registration of the existing Android package `dev.pages.blccalendar` in Firebase production and downloading its configuration. No response yet; no registration performed. Repository instructions require explicit authorization for external changes.

## Findings and repairs

- Read-only production database checks found schedules in both academies, including October. This does not prove connectivity from the affected phone.
- Logout clears schedules, but same-academy login did not restart the production data subscription. Added role to the subscription lifecycle; regression test logs out and back into the same academy.
- HTTPS fallback now tolerates metadata failures, does not overwrite newer realtime schedules, and retains successfully loaded data when realtime transport fails. KTA connection errors no longer masquerade as a successful empty schedule.
- Removed schedule payload logging. Academy paths and student cycle restrictions are unchanged.
- The photographed blocking box is notification onboarding, distinct from the post-save notification chooser fixed October 8. Extracted onboarding with an in-flow SVG X and a separate Not now button, both available during pending/failed requests. Retained dismiss preference across login/logout. Improved notification error wrapping and settings layout on narrow screens.
- Failed unsubscribe from the Settings toggle now preserves registration for retry instead of claiming OFF and discarding the token/topic. Logout cleanup retains its separate behavior. Availability failures are caught in the UI.
- App Open ads retain the one-hour cooldown and native-only policy. Invalid or future stored timestamps no longer suppress ads indefinitely. Added mocked native load/show, simultaneous-call, retry-after-no-fill, and web exclusion tests. Actual device ad fill/display remains unverified.
- Read-only Firebase CLI app listing succeeded and returned only iOS and Web registrations for `blc-calendar-e302f`; no Android app was registered. `android/app/google-services.json` is absent. Existing Gradle configuration silently skipped Firebase setup when it was missing. Changed this to an actionable build failure; local readiness check also fails rather than warning. Do not manufacture a configuration file or reuse the iOS/Web app ID.

## Verification

- `npm.cmd ci` completed with the existing AdMob patch.
- Full Jest: 26 suites, 109 tests passed. Includes existing Commander switch, Android/iOS Chief claim recovery, academy boundaries, modal dismissal and parsing-preview coverage, plus new audit regressions.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run build`: passed with known AdMob source-map and Browserslist warnings.
- Local-only production handler check passed: academy Chief claims, Commander read-only, invalid login rejection, cross-academy send rejection. No current emulator rules test or production event edit was run in this audit; prior October 8 emulator verification remains recorded separately.
- Local readiness diagnostic reports the missing Android Firebase configuration as a blocker. Native compilation and device E2E are not claimed as passed.
- Scoped diff whitespace check passed.

## Remaining steps

1. With explicit approval, register Android package `dev.pages.blccalendar` in the existing production Firebase project, download its `google-services.json`, and validate package/project match without printing credentials.
2. Reconcile preserved local Android versionCode/minSdk changes before any release: base source still has versionCode 11, while the old worktree had versionCode 12/minSdk 24 changes. Check Play Console's latest uploaded code before choosing the next release version. Do not overwrite the existing store app identity.
3. Compile/debug-test the corrected Android build and verify FCM token initialization, registration/unregistration, foreground/background receipt, and persistent onboarding dismissal on the affected phone.
4. Confirm installed Android version/build/install source. GitHub commit October 8 used `[skip ci]`; it did not update already-installed apps. A new approved/distributed build must actually be installed. Missing native Firebase setup is a separate blocker, so review delay alone is not a sufficient diagnosis.
5. On Android and iPhone verify fresh and restored Chief sessions, same-academy re-login, Commander switching, academy-scoped event editing, and student restrictions. Real production event edits require an approved test change; none was made during this audit.
6. GitHub push, server deployment, store build/submission remain separate explicitly requested actions.
