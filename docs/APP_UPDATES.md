# Store update guidance

Automatic release monitoring is now implemented locally; see [UPDATE_AUTOMATION.md](UPDATE_AUTOMATION.md) for behavior, tests and the pending identity/Play-access/push/activation steps. It is not yet running in production. The manually published 4.1.1 / 2.0.3 announcements remain active.

The native app checks Firebase Remote Config at launch and on foreground entry. It reads the installed marketing version using Capacitor App, not package.json or the web build version. Web/PWA and emulators do not query or show store prompts.

## Publishing an announcement

In the production Firebase project's Remote Config console, create two **String** parameters: `app_update_ios` and `app_update_android`. Each contains JSON:

```json
{"enabled":false,"latestVersion":"0.0.0","notes":"Describe the changes users will notice."}
```

Keep these disabled until a real release is publicly available. For each platform separately:

1. Verify that the App Store / Google Play listing actually offers the release, with compatible OS requirements. TestFlight/internal test builds and GitHub/Pages deployments are not public store releases.
2. For Android staged rollout, wait until the release is available to the intended users (normally 100% rollout) before enabling a global announcement.
3. Set `latestVersion` to the public **marketing version** (for example, `4.0.10`), enter release notes, set `enabled` to true, and publish Remote Config changes.
4. Check an older installed store build that already includes this feature, and the current build: only the older build should be prompted.
5. To stop an announcement, publish `enabled:false`. Clients refresh on launch/foreground subject to the one-hour fetch cache.

The App Store destination is app ID `6790968637`; Google Play uses the existing bundle/application ID `dev.pages.blccalendar`. Destinations are fixed in code so remotely edited notes cannot redirect users to an unrelated site. Remote Config values are public and must not contain secrets.

## Behavior

- Optional prompt; no forced-update gate or minimum-version enforcement in this first implementation.
- Later, Escape, or following the update link snoozes that platform/version for 24 hours. A different newer version can prompt immediately.
- The Settings update card stays available while the installed version is behind, even during snooze.
- Invalid, missing, disabled, equal, or older versions do not prompt. Offline/plugin/config failures never block login or schedules.
- No notification permission is needed. Users who never open the app will not see this in-app guidance.
- Existing installations must first install a native release containing this feature. A Pages deployment alone cannot add the native version-reading plugin to installed apps.

## Native integration

The dependency is `@capacitor/app` (Capacitor 8). Run `npm run native:sync` before a native release; Codemagic already runs `npx cap sync ios`. Follow `docs/release-checklist.md` for native compilation/device checks. This implementation does not publish Remote Config values or submit a store release automatically.

## Prepared repair for the owner-confirmed production releases (2026-10-31)

The owner confirms Android 4.1.1 (15) and iOS 2.0.3 have already been in Production for some time. Do not ask for release confirmation again. Remote Config initially advertised 4.1.0 and 2.0.2; the authorized repair below has now published 4.1.1 and 2.0.3. `scripts/update-announcements.cjs` targets only these two versions and preserves release notes, other parameters and conditions.

- `node scripts/update-announcements.cjs --check`: read-only current/proposed version summary.
- `node scripts/update-announcements.cjs --validate`: server-side `validate_only` check without publication; passed on 2026-10-31.
- `node scripts/update-announcements.cjs --publish`: **only after explicit publication authorization**. Re-reads the current template, refuses downgrades/conditional overrides/disabled announcements, validates, backs up to ignored `.firebase/update-announcement-backups`, publishes with the original ETag, then reads back. Concurrent configuration edits cause failure instead of overwrite. No ambiguous write retry.
- `node --test scripts/update-announcements.test.cjs`: focused preservation/version checks.

The local tool reuses the installed Windows Firebase CLI login, as existing diagnostic scripts do. It is a scoped repair tool, not a scheduled service or store-release detector. The owner does not need to edit console JSON manually. On 2026-10-31, the owner explicitly requested publication: validation, local backup, ETag-protected publish and readback succeeded for Android 4.1.1 and iOS 2.0.3. Device validation remains pending.

## Ordered follow-up and automation boundary

1. Publish the prepared announcement repair after explicit authorization; read back both versions. No new app binary is needed for installations already containing the update feature.
2. On an older feature-containing installed app, check the prompt/store link after a successful refresh outside the one-hour cache; current versions must not prompt. A dismissed announcement is snoozed for 24 hours. Chief should then update and retry the required schedule edit; retain the failure/version evidence if it persists. Do not uninstall or clear data as a first step.
3. Establish a durable release checker under non-school-controlled credentials. Existing Codemagic configuration covers iOS builds/TestFlight, not production-release detection. No scheduled checker or verified store API credentials are configured by this work.
4. Implement store adapters plus dry-run reporting before scheduled publication. Google Play production release status and versionCodes must be checked; map versionCode to the actual built marketing version, never assume the release name is a version. Apple checks must exclude TestFlight/review/pending releases and account for intended storefront availability. Handle phased/country rollout explicitly before announcing globally. Store/API failure must preserve the current announcement and produce an operator-visible failure.
5. Test pending/testing/halted releases, duplicate runs, older releases, API errors, and concurrent Remote Config edits. Connect approved runtime credentials, run against actual accounts in dry-run mode, then separately authorize deployment and scheduled automatic publication. Prefer narrowly scoped service identity over a personal CLI refresh token in automation. Never paste keys into chat or commit them.
6. Continue organization/billing checks alongside device feedback; finish backups/recovery before project moves or school-account removal. Keep read-security work separate from this announcement repair.

References: [Remote Config automation](https://firebase.google.com/docs/remote-config/automate-rc), [Remote Config validation and ETags](https://firebase.google.com/docs/reference/remote-config/rest/v1/projects/updateRemoteConfig), [Google Play release fields](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks), [App Store versions](https://developer.apple.com/documentation/appstoreconnectapi/app-store-versions).
