# Store update guidance

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
