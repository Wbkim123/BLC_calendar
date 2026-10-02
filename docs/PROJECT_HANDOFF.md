# NCOA Schedule Calendar — Project Handoff

Last updated: 2026-10-02

## Conflict details and KTA UTC display (2026-10-02)

- Event View now lists each affected counterpart directly inside its event card, including event name, displayed time, location, and academy for commander cross-academy AUD/MPR conflicts. Calendar conflict markers navigate to that day's Event View; no conflict details dialog is used from the calendar. BLC and KTA event highlighting share the same time-overlap rule.
- KTA `start-UTC` entries display that source-facing time in import preview and schedule view. Since the end time is unknown, calculations use a zero-length numeric range so later events are not falsely marked as conflicts; staff may edit the event to a known time range.
- Verified: 20 Jest suites / 69 tests passed, TypeScript passed, production build completed with known AdMob source-map and Browserslist warnings. Conflict details and UTC behavior were pushed as `3d8ec51`; Cloudflare Pages later marked it Active.
- Follow-up after the user reported the marker was difficult to activate: increased its phone touch target from 16px to 28px and clarified its accessible label/title. The focused marker-click test, TypeScript, and build passed. Pushed as `343cb8e`; Cloudflare Pages reports Production Active at `https://96908b31.blc-calendar.pages.dev`. The stable project URL remains `https://blc-calendar.pages.dev`.
- User clarified that conflict details belong in Event View, not a Calendar dialog. Updated each affected event card to list its counterpart and made the Calendar marker navigate to that date's Event View. Commander cross-academy AUD/MPR conflict counterparts are included there. Verified all 21 Jest suites / 71 tests, TypeScript, and production build; build retains known AdMob source-map and stale Browserslist warnings. This follow-up is local and has not been pushed or deployed.
- Removed the Calendar conflict exclamation button and its legend; conflict dates retain the red visual treatment, and selecting the date still opens Event View. Focused Calendar navigation test updated. This change is local and has not been pushed.

## Cycle-start interim protection and calendar controls (2026-10-02)

- Fixed saved web test-session restoration: only production NCOA manager profiles are normalized to read-only on reload. A saved test manager retains its test administrator profile, restoring Import and the BLC/KTA switch after refresh; production commander permissions remain read-only.
- Deployed temporary production Realtime Database Rules to `blc-calendar-e302f`: existing write paths require `auth.token.admin === true`, removing the old `testAdmin` write bypass. The deployed rules were read back and confirmed. Root `.read: true` and existing ordinary admin writes remain unchanged. This blocks the deployed test custom token, which carries `testAdmin` but not `admin`; it does not yet enforce commander read-only or academy-scoped admin writes. Replace with the full Functions + academy-scoped Rules rollout when the required Secret Manager policy is resolved.
- Admin calendar controls now place Import left and Search right in one row. Settings is a circular fixed button at bottom-left, opposite the chatbot. Removed the Display View setting and obsolete saved preference; TV-display profiles still select TV mode automatically.
- Validation from a clean worktree based on `origin/master` (`69bf730`): 19 Jest suites / 66 tests, TypeScript, and production build passed. The build has the existing AdMob source-map and Browserslist warnings. Calendar action layout and Display View removal were pushed as `0164513`; saved test-profile restoration was pushed as `7a7c440`. Cloudflare Pages reports commit `7a7c440` active on Production at `https://c5c96d0d.blc-calendar.pages.dev`. No native app/store update was made.
- Full Functions deployment remains blocked by the UCSD organization resource-location policy. Per-cycle read confidentiality remains app-level only, with root `.read: true` retained for TV/client compatibility.

## Role permissions clarified (2026-10-01)

- NCOA commander profiles are read-only in the app and receive schedule notifications for both academies. The calendar can flag cross-academy conflicts only when locations match and event times overlap. Within either academy, overlapping event times remain conflicts regardless of location.
- Academy Chief profiles retain the existing administrator tools for their own academy: event editing, PDF import, locations, uniforms, and cycle database management. SGL profiles remain read-only for all cycles in their academy. Student access-code resolution is BLC-only and active-cycle scoped; the app filters calendar/search results to the assigned cycle and inactive cycles do not resolve.
- Production custom tokens no longer grant the commander `admin`; schedule notifications reject cross-academy/commander send attempts. Full academy-scoped production Database Rules remain pending; the temporary rules deployed 2026-10-02 only remove `testAdmin` writes while preserving legacy admin writes. Staging remains separately scoped to its staging manager token.
- Commander push registration uses a dedicated audience topic for all schedule updates; Chief and SGL subscriptions remain academy-scoped. The staging test path continues to relay only to the approved test device.
- Important limitation: production RTDB still has root `.read: true` for existing client and TV compatibility. Student cycle filtering is currently an app-level view restriction, not a database-level confidentiality boundary; direct database reads can retrieve schedules outside the assigned cycle. Enforcing per-cycle server-side reads requires a separate student-authentication/rules migration and compatibility work for existing TV clients.
- Verification for the scoped role source change: Jest 19 suites / 64 tests passed; TypeScript and production build passed with existing AdMob source-map and Browserslist warnings; Functions JavaScript syntax and scoped `git diff --check` passed. Pushed to GitHub `master` as `69bf730`. The full production Functions/Database Rules deployment stopped because the organization resource-location policy rejected creating the required automatic-replication Secret Manager secret in `global`; the temporary test-write block was deployed separately on 2026-10-02. Cloudflare Pages status for the role release was not independently verified. The Firebase Functions dependency migration remains separate and unchanged.

## Web calendar UX release (2026-10-01)

- Published the reviewed web UI updates to GitHub `master` as commit `805d6fd` (`[skip ci] Refine calendar controls and search modal`) and deployed the verified CRA build directly to Cloudflare Pages. Production deployment: `https://5e9269fb.blc-calendar.pages.dev`; `https://blc-calendar.pages.dev` now serves `main.66c1d6b2.js` and `main.a192b103.css`.
- Released changes: search on a full-width row, Import and Settings side by side at matching button heights, academy selector inside Settings, centered search dialog, friendly inline robot chatbot icon, and phone preview support for remembered local emulator sessions. Import retains its green style.
- Scope was limited to seven web source files in the isolated release worktree. Validation: 17 Jest suites / 58 tests passed; production build completed with the known AdMob source-map and stale Browserslist database warnings; `git diff --check` passed. No Firebase Functions/Database Rules deployment, native app/store update, production schedule data write, or store-listing metadata update was performed.

## Centered event search dialog (2026-09-30)

- Event search now opens centered on phone and desktop with a rounded modal and viewport-relative maximum height, matching the centered import dialog while keeping the search results scrollable.
- Verification: 17 Jest suites / 56 tests passed; optimized build passed with only existing AdMob source-map warnings. No deployment was performed.

## Calendar action order and chatbot launcher icon (2026-09-30)

- Calendar controls now appear in the requested order: class title/header, full-width Search, Import and Settings side by side, then the calendar board. Import retains its original green gradient and Search remains a single full-width control. Non-admin users retain search and settings without an Import control.
- Search and Import button heights were reduced to match the Settings button.
- Replaced the chatbot launcher speech-bubble outline with a friendly inline robot-face SVG; no external image asset or dependency was added.
- Verification: 17 Jest suites / 56 tests passed; `npx.cmd tsc --noEmit` passed; optimized build passed with only the known AdMob source-map warnings. No deployment was performed.

## Calendar toolbar UX and staging browser push approval (2026-09-30)

- Reworked the calendar toolbar so Search and Import have larger, evenly spaced touch targets and Settings sits on its own row. Moved the BLC/KTA academy switcher into the administrator Settings panel under Academy; only NCOA-scoped profiles receive that control. Search/import access, academy-scoped data routing, and the PDF preview plus explicit Confirm Import flow remain unchanged.
- User's browser reported that the test device needs approval to receive push. This is the expected deny-by-default response: the browser's FCM token fingerprint is not in the staging relay's allowlist, so no push was delivered. Approval requires configuring `STAGING_PUSH_TOKEN_SHA256` for the relay and deploying the relay function; neither was done. Do not write the device fingerprint/token into project memory. After explicit approval and relay deployment, test web push on that same phone/browser; a later token rotation/browser reinstall may require reapproval. Web push permission/registration is separate from verifying an actual schedule-change notification end to end.
- Verification: `npm.cmd test -- --watchAll=false --runInBand` passed (16 suites / 53 tests); `npx.cmd tsc --noEmit` passed; `npm.cmd run build` passed with only existing AdMob source-map warnings. No push, Firebase/Cloudflare deployment, or native app update was performed.

## Local emulator phone preview and toolbar color correction (2026-09-30)

- Restored the Import button's original green style. Local Firebase emulator administrator sessions are now included in the phone-preview wrapper, so running the browser app locally after emulator login shows the same phone-width preview as the staging test session. The emulator data remains local; a phone accessing a development server over Wi-Fi also needs the app and emulator host configured with reachable LAN addresses.
- Added focused preview tests for emulator, staging, and ordinary login sessions. Emulator login now emits the preview refresh event after saving the remembered session.
- Verification: `npm.cmd test -- --watchAll=false --runInBand` passed (17 suites / 56 tests); optimized build passed with only existing AdMob source-map warnings. TypeScript passed in the preceding toolbar change; the latest additional changes are covered by Jest/CRA build. No push or deployment was performed.

## FCM Instance ID topic API migration preparation (2026-09-29)

- Prepared the Cloud Functions dependencies for Firebase's topic API migration: `firebase-admin` `^14.5.0` and `firebase-functions` `^7.4.0` in `firebase-functions/package.json` and lockfile. Node runtime remains 22. Admin SDK 14.5.0 changes the existing `subscribeToTopic` / `unsubscribeFromTopic` calls to FCM v1 topic subscription requests; this app does not call the deprecated `*Legacy` methods. Functions 7.4.0 accepts Admin SDK 14 and cleared the Firebase CLI outdated-SDK warning.
- No notification logic, topic names, authorization, or Firebase project settings changed. No source was pushed and no Cloud Functions were deployed.
- Verification: installed exact lockfile versions with `npm ci`; staging push policy tests passed (4/4); Firebase emulator loaded all production function exports and `npm run test:emulator` passed (16 suites / 53 tests plus Realtime Database smoke test). Emulator used host Node 24 and warned that the configured/deployed runtime is Node 22; the Functions package remains configured for Node 22. Inspected Admin SDK 14.5.0 implementation to confirm normal topic subscribe/unsubscribe methods use `fcm.googleapis.com/v1/projects/.../topicSubscriptions`, while only explicitly named `*Legacy` methods use `iid.googleapis.com`.
- `npm audit fix` updated `protobufjs` to 7.6.6, removing that advisory. Two moderate audit findings remain for `uuid` 9.0.1 pulled by `gaxios` 6.7.1 under optional Cloud Storage dependencies. No forced override was applied. These are separate from the Instance ID API migration.
- Remote FCM v1 topic subscription was not called. The staging Functions code intentionally sends only to the approved device token and has no topic subscribe/unsubscribe operation, so a staging deploy alone will not exercise the migrated endpoint. Before production rollout, decide whether to add a temporary staging-only topic probe for the user's device or validate by narrowly deploying only production `registerPushToken` / `unregisterPushToken` after the user authorizes that production change. Review runtime service-account permissions if the new endpoint returns IAM denial. No app/store update is needed for this server migration.

## Browser preview shared staging auth persistence (2026-09-28)

- User's follow-up screenshot showed the phone preview iframe still had no restored staging Firebase user after the initial auth-ready fix. The staging web Auth instance now explicitly uses Firebase `browserLocalPersistence` (shared same-origin local storage) before sign-in and before token reads. Native app behavior bypasses this browser-only persistence setup. Added a focused test for the staging browser persistence configuration.
- Verification in the isolated release worktree: 17 Jest suites / 58 tests passed; `npx tsc --noEmit` passed; production build passed with only the known AdMob source-map warnings.
- Pushed `07279c7` to `origin/master`; deployed to Cloudflare Pages at `https://ba94f043.blc-calendar.pages.dev`. The production hostname now serves `/static/js/main.153e9559.js`. Actual staging sign-in and database load still need the user to retry in their browser; if it fails again the error may now identify database authorization/configuration after auth is restored.
- Firebase browser persistence change applies only to the staging client. No native release, Firebase rules/Functions, or production database changed.

## Browser preview re-login recovery control (2026-09-28)

- Added a `SIGN OUT & SIGN IN AGAIN` action to the staging API error screen so a remembered test session with missing Firebase Auth state can return to Login instead of trapping the user inside the iframe preview. It reuses the normal logout path, clearing the remembered session and signing out both Firebase Auth instances.
- Verification: 17 Jest suites / 58 tests passed; TypeScript passed; production build passed with the known AdMob source-map warnings.
- Pushed `8972a0f` to `origin/master`; deployed at `https://2626ce78.blc-calendar.pages.dev`. Production `https://blc-calendar.pages.dev` should now serve `/static/js/main.aea1310e.js`. User should hard-refresh; if the screen still reports missing auth, click `SIGN OUT & SIGN IN AGAIN`, then sign in again so the refreshed build stores the staging web session with shared local persistence.

## Browser staging preview auth fix (2026-09-28)

- After the browser staging preview release, the user reported the framed app showed `API Connection Error`. The first database request could race the Firebase Web Auth iframe's persisted-session restoration. `getAdminIdToken` now waits for `authStateReady()` before reading the current user. Database access errors now show actionable 401/403 and 404 guidance instead of collapsing every failure into one generic message.
- Mirrored the source fix in the main worktree and the isolated web release worktree. Verification in the release worktree: 16 Jest suites / 57 tests passed; `npx tsc --noEmit` passed; optimized build passed with only the known AdMob source-map warnings.
- Pushed commit `676760c` to `origin/master` and deployed to Cloudflare Pages. Deployment URL: `https://68a77489.blc-calendar.pages.dev`; production `https://blc-calendar.pages.dev` now serves `/static/js/main.f8885525.js`. No Firebase config/rules/Functions, production DB, or native app/store release changed. Real login against the staging project still needs user/browser verification.
- GitHub secret scanning identified the staging Firebase Web API key in `src/staging.ts`. This is the client key required in a Firebase Web app bundle, not an Admin SDK/service-account secret. Do not remove or rotate it without updating every web/native client using it. In Google Cloud Console, verify API and website/platform restrictions are set for Firebase Auth/Realtime Database and the actual client origins; if the key is Firebase-provisioned and appropriately restricted, resolve the GitHub alert as a public client-key false positive. Do not add the key to logs or docs.

## Browser staging test preview production release (2026-09-28)

- User requested a GitHub push expecting the Web site to deploy. Created isolated release branch `release/web-phone-preview` from published TV commit `6492b8a`; pushed `b4c912b` to `origin/master`. The release changes only app source under `src/`; the intentionally dirty main worktree and native projects, production DB rules, and Functions were not pushed.
- The tested source supports browser login to the remote staging project, routes staging writes through staging-authenticated REST calls, and renders the app in a true phone-width preview iframe. To provide the full testable UI, the source release also includes current KTA import/parser, event search, chatbot, and other app features present in the staged frontend source. Website tests passed (16 suites / 57 tests), TypeScript passed, and production build passed with only the known AdMob source-map warnings.
- The commit message began with `[skip ci]` to prevent Codemagic from starting a native store build; Cloudflare Pages also skips Git builds for that prefix. Therefore the Pages artifact was deployed directly with Wrangler after the user-requested push. Production `https://blc-calendar.pages.dev` now serves `/static/js/main.56d1a4d0.js`. Wrangler deployment URL: `https://f151f5dd.blc-calendar.pages.dev`. No native app/store update, Firebase rules/Functions deployment, or production schedule write occurred.
- Actual browser login/edit/push verification remains pending. Browser staging notifications still require an approved FCM token; the native app update remains a separate later release.

## Browser staging test preview (2026-09-28)

- The web source now accepts the server-authenticated staging test session. Its app UI opens inside a same-origin phone preview iframe with a real narrow browser viewport, so Tailwind mobile breakpoints, scrolling, and fixed-position app controls behave as on a phone. The desktop browser wraps the preview in a device frame; a narrow browser fills its screen. A remembered staging test login is retained so the iframe can restore the session.
- Browser test auth and callable Functions use a separately named Firebase app for `ncoa-calendar-staging`; staging database routing remains strict, and writes still require the staging auth claims/database rules. Browser test push registration and sends use the staging relay, which continues to allow only an explicitly approved FCM token. Desktop browser preview cannot emulate OS push; a browser-created token on a physical phone may need separate approval.
- This is source/build work only. The public TV website has not received this preview change. No website, Firebase, or app deployment was performed for this change. After an authorized web deployment, the live site can present the preview; the native app update remains a separate later release.
- Verification: TypeScript passed; 15 Jest suites / 52 tests passed; optimized web build passed with the known AdMob source-map warnings. Real-browser and physical-device visual/push verification remain pending.

## Remote native staging preparation (2026-09-28)

- User created `ncoa-calendar-staging`, supplied its web-app configuration, and reports Authentication initialization and Blaze connection complete. The Realtime Database URL is `https://ncoa-calendar-staging-default-rtdb.firebaseio.com`. Remote configuration has not been independently verified.
- Supersedes the earlier read-only mobile-test design: local native test-login code now routes authentication, token refresh, functions, and all schedule/location/uniform reads/writes to staging. Authenticated REST reads poll every five seconds and refresh after writes. Staging tokens use a separate storage namespace; no production fallback is allowed. Staging remains native-only with app layout. BLC/KTA paths and PDF preview/confirmation remain intact.
- Added `firebase.staging.json`, strict `database.rules.staging.json`, project-specific staging function exports, and project-checked predeploy hook. Staging login requires Secret Manager `STAGING_ACCESS_CODE`; its value has not been provisioned. Existing production exports and pending backend hardening are preserved.
- Same installed app retains production native FCM configuration. Added `relayStagingNotification` for a separately scoped production deployment. It validates staging-issued ID tokens and staging manager claims, and sends only to the one approved token fingerprint (`STAGING_PUSH_TOKEN_SHA256`, default deny). Caller topic/condition payloads are ignored. No broad cross-project messaging/database permission is introduced. Demo emulator does not load the remote relay or its deployment parameter.
- Test notification enablement sends a welcome push; schedule-change sends target the same device only. Device approval failures remain visible instead of prematurely marking notification setup complete. Switching environments rotates the FCM token to remove old audience subscriptions. Test-only logout retains the underlying token; a real token rotation or production/test switch requires reapproval. OS notification delivery and installed native behavior are still unverified.
- Prepared deployment/device/data steps in `docs/staging-setup.md`. The staging login secret, staging rules, five staging Functions, staging-only self signing permission, 30-day image retention policy, and exactly one production device-only relay function were deployed. No schedule data, website, GitHub, native assets, installed app, or store release was changed. Initial test baseline now contains the six schedule/location/uniform paths copied after confirming staging was empty: BLC 165 schedule days, 9 locations, 3 uniforms; production KTA paths were empty. PDF changes remain preview/confirm and staging-only.
- Verification: staging rules passed against local Auth/Database emulators (anonymous, normal-admin, student denial; authorized six-path reads/writes; root/unrelated denial; multi-path update). Relay policy has 4 passing Node tests. Existing emulator integration passed with 14 suites / 52 tests and DB smoke test before the final notification-error UI test. Final frontend verification: 15 suites / 53 tests passed, TypeScript passed, optimized production build passed with only the known AdMob source-map warnings. Staging deploy project guard passed for the correct project and rejected the production project. Known unrelated `DailyView.tsx` trailing whitespace remains untouched.
- Verified remotely: staging login function issued a custom token; Auth exchanged it for an ID token; authenticated staging DB read succeeded; an unapproved push token was rejected before delivery. Next: prepare/install the updated app on the user's device, enable notifications and approve only its fingerprint, seed staging via confirmed PDF import or a separately approved one-time data copy, then verify actual push receipt and TV/production isolation. Existing installed apps do not contain staging routing and do not gain new UI/database behavior from the server deployment. Previously deployed production behavior in older builds remains as noted above.

## Mobile test-session and TV release boundary (2026-09-27)

- The administrator test session is now native-app-only. On a phone it forces the app layout and hides the TV layout selector; a saved test session is rejected by Web login restoration. Test mode reads the current production schedules for viewing, but app database write helpers reject schedule/location/uniform writes and notification onboarding/settings are disabled. Function source now grants this session a non-admin claim, and the production database rules no longer grant `testAdmin` writes. These backend protections take effect only after the separately approved Functions/Database deployment; until then, installed production versions still use the deployed backend behavior.
- This read-only restriction is intentional until a remote Firebase staging project is available. The local `demo-*` Emulator Suite is isolated to the developer's computer and cannot be used as the backend for an installed phone app over the public internet. Writable physical-device QA needs a separately configured, remotely reachable staging Firebase project; project availability/selection is awaiting the user's answer.
- A native app build/store update contains its own bundled WebView assets and does not deploy the Cloudflare TV website. The TV code only changes through a separate website deployment. TV screens still read the shared production schedule data, so intentional production schedule edits continue to appear there; test-session writes are blocked.
- Verification after mobile-only gating and backend source hardening: TypeScript passed; 12 Jest suites / 43 tests passed; optimized production build passed with known AdMob source-map warnings; `npm run test:emulator` passed with functions loaded from the updated source and RTDB smoke test. No website deployment, Functions/Database deployment, or app-store update was performed for these changes.

## Local Firebase test isolation (2026-09-27)

- Local CRA development and unit tests now target only the Firebase Emulator Suite using the `demo-blc-calendar` namespace on loopback. Start with `npm run emulators`; run `npm run test:emulator` for the unit suite plus a database emulator smoke test. The wrapper finds the configured Android Studio JBR when Java is not on PATH. The emulator uses a separate permissive rules file referenced only by `firebase.emulators.json`; production `firebase.json` and production rules remain unchanged.
- Emulator sign-in uses anonymous Auth Emulator accounts, seeded schedules are created only in the emulator, and a visible local-only banner identifies emulator sessions. Settings/onboarding and notification APIs block push registration/sending in emulator mode; local function handlers are stubs.
- Production behavior no longer writes mock schedules or fills missing location/uniform nodes automatically. A `prebuild` check blocks production builds if emulator mode or a demo project override is present in the build environment.
- Verification: TypeScript passed; 11 Jest suites / 41 tests passed; optimized production build passed with the known AdMob source-map warnings; `npm run test:emulator` passed and verified an RTDB write/read/delete only inside the demo emulator. `git diff --check` still reports trailing whitespace in an unrelated pre-existing dirty `src/components/DailyView.tsx` line. No push, deployment, store build, or Firebase production operation was performed. Main worktree remains intentionally dirty and is behind the separately deployed TV-only production commit; do not push its old HEAD or overwrite unrelated user changes.

## TV website production deployment (2026-09-26)

- User explicitly requested GitHub push and deployment after approving TV-only website access and automatic cycle/date advancement. Created an isolated worktree at `release-assets/web-tv-deploy`, branch `release/web-tv-20260926`, from published commit `4de4f6c` so unrelated local frontend/backend/native changes were preserved.
- Pushed scoped commit `6492b8a3a891cde5b92fe81ad259faef7ae3213b` to `origin/master`. The commit uses `[skip ci]` to avoid the automatic Codemagic store workflow. Cloudflare authentication was renewed interactively, then the tested build was deployed directly with Wrangler to project `blc-calendar`, production branch `master`.
- Deployment URL: `https://2336d6e2.blc-calendar.pages.dev`. Production `https://blc-calendar.pages.dev` serves `/static/js/main.fed21f5b.js`; downloaded production JavaScript SHA-256 exactly matched the scoped tested build. GitHub remote master was verified at the pushed commit.
- Scoped release tests: **4 suites / 12 tests passed**, including website TV login, academy isolation, empty KTA schedules, no read-only initialization writes, rejected cached importer sessions, authenticated owner access, cycle controls, and automatic progression. TypeScript passed; final production build passed with only known AdMob source-map warnings. Actual physical-TV visual verification remains pending.
- Scoped website retains the previously published owner/native features. Owner web login uses the existing server authentication and validates owner claims, without depending on the pending new backend authentication deployment. Only TV credential resolution was added to this scoped release; unreleased staff/student code extensions were not published. KTA TV is read-only and uses academy-prefixed reads; no Firebase rules/functions were deployed.
- Pending KTA PDF import/search/chatbot, native assets, Android version changes, and other unrelated work were NOT included. Main worktree remains intentionally dirty, with local `master` still at `4de4f6c`; `origin/master` is now ahead at `6492b8a`. Do not reset or overwrite the main worktree, or push its older HEAD blindly. Reconcile the scoped release with the broader local changes before a later release. Scoped source is available in the isolated worktree; its integration tests and owner-auth compatibility differ from the broader main-worktree implementation.

## Web TV-only access (2026-09-26)

- User chose website access for academy TV profiles and the owner only. `canUseWebsite` permits `TV_DISPLAY` scoped to its academy and `NCOA_MANAGER` scoped to NCOA; student, senior/SGL, and schedule-importer web logins are rejected, including restored sessions. Existing native login behavior is retained.
- Added separate BLC/KTA TV credentials in `src/features/auth/tvAccessCodes.ts`, subsequently replaced with the user-selected values. Treat values as operational credentials; never copy them into messages, UI, logs, or documentation. They resolve to read-only `AccessProfile` objects without requiring an active cycle.
- TV profiles open Event View directly, with cycle/date selectors and settings, fixed TV layout, no Calendar return, and an empty state when schedules are unavailable. Cycle navigation remains academy-scoped. Default AUTO cycle selection refreshes every 30 seconds and on visibility changes, choosing the current/next unfinished scheduled day and advancing to the next cycle after the last event. Manually choosing a cycle pins it; selecting AUTO restores automatic cycle selection. Existing automatic date advancement operates within the effective cycle. Owner retains existing views and management features.
- Verification after credential replacement and automatic cycle advancement: 10 test suites / 37 tests passed; TypeScript passed; production build succeeded with known AdMob source-map warnings. No push, deployment, or native release was requested or performed for this change. Actual TV/browser visual verification remains outstanding.
- Prior live-state inspection confirmed GitHub master at `4de4f6c` and the public web bundle already suppresses web AdMob placeholders. The new TV-only access change remains local until separately authorized deployment.

## Android version-code correction (2026-09-26)

- User reported Play rejecting reused versionCode 10. Updated the main workspace Android versionCode from 10 to 11; versionName remains 4.0.7 and application ID remains unchanged.
- Verification: inspected the Gradle diff. No UI or logic changes; no tests, native build, upload, or deployment performed. Existing AAB files must be rebuilt and signed before uploading; the separate scoped release preparation already specifies versionCode 11.

## Android advertising follow-up (2026-09-26)

- Scoped Play update preparation: created `release-assets/classday-4.0.8` from baseline commit `114557e` so the pending KTA and other unrelated worktree changes are excluded. The scoped source changes only the Android production banner ID to `/9153482546`, display/store-facing app name strings to `ClassDay Calendar`, version name to `4.0.8`, and Android versionCode to `11`; generated a scoped diff and release notes under `release-assets/`. Source/tests/build verification: workspace tests 7 suites/30 tests passed; scoped source has no tests in the baseline; scoped web build passed with known AdMob source-map warnings.
- Release AAB is not yet available. `bundleRelease` reaches Android dex merge and emits very large D8 Kotlin-metadata warnings, then does not complete in this environment; repeated offline/limited-worker attempts were stopped. No signed artifact was produced. The existing Play upload keystore was not found in the workspace, and release Gradle signing is not configured. User must use the existing upload key in Android Studio (or provide its local path without sending the password) and may need to build there. No upload or deployment performed.
- Follow-up runtime log also emitted `bannerAdImpression` for the new unit. Native SDK loading AND impression are therefore confirmed (no screenshot captured). This supersedes the preceding note that impression was unverified.
- Device verification completed after USB reconnection: with prior explicit authorization, uninstalled ONLY dev.pages.blccalendar, installed android/app/build/outputs/apk/debug/app-debug.apk, and launched MainActivity. User was asked to log in directly on device in normal mode. App-scoped Logcat then showed production banner ID /9153482546 followed by `AdMob banner loaded`. This confirms successful native banner loading with the replacement standard unit; actual visible impression was not independently captured. Earlier old-unit attempts returned NO_FILL. Device now has local debug 4.0.7 (10), not the Play-signed build. No Play upload/release performed. Next: prepare a separately authorized signed Play update (versionCode >=11, agreed version name, final branding/release checks); debug signature differs from Play, so returning this device to a Play build will require handling the signature mismatch again.
- User explicitly authorized removing the Play installation and installing the prepared debug APK for pre-release device testing after being informed of local data loss. Authorization persists; do not ask again. At execution, ADB reported offline, then no attached device after reconnect/server restart. No uninstall/install occurred. Await physical USB reconnection and debugging authorization, then uninstall ONLY dev.pages.blccalendar, install the prepared debug APK, ask user to log in locally, and inspect focused ad load results. APK manifest was verified as dev.pages.blccalendar, version 4.0.7 (10), MainActivity; display rename is not included.
- User authorized next local Android validation step. Ran `npx.cmd cap sync android` and `gradlew.bat assembleDebug` with JDK at D:/Android/sdk/jbr; native build succeeded. Verified generated `android/app/build/outputs/apk/debug/app-debug.apk` contains new production banner ID /9153482546 and no old /6937828493 in main JS. App/package IDs and version remain unchanged; this is a local debug artifact, not a Play release.
- Connected phone's Play base APK was copied to temporary storage for certificate comparison. Both signatures verify but Play and debug certificates differ. Did not uninstall, clear data, or install the debug APK. In-place debug update cannot preserve the existing Play installation with these signatures. Pending user choice: explicitly permit uninstall/reinstall for local testing (local settings/notes may be lost), use another device, or separately authorize a Play testing release. Actual new-unit ad serving remains unverified. No push/store upload/deployment performed.
- Verification after replacement: `npm.cmd test -- --watchAll=false --runInBand` passed (7 suites / 30 tests); `npm.cmd run build` passed with known AdMob source-map warnings. No native build, install, push, or deployment performed.
- User supplied replacement Android banner unit `ca-app-pub-1251095758735054/9153482546` after instructions to create a standard (non-partner-bidding) banner. Updated only `ANDROID_BANNER_AD_ID` in src/components/AdMobBanner.tsx; retained iOS/test IDs and app/package IDs. This supersedes the earlier next step to obtain a new ID. Existing Play installs still use the old unit until an authorized update is released. Native asset copy/sync, device serving verification with the new unit, and release remain pending; do not assume changing source updates the installed app.
- Root configuration mismatch identified in subsequent user screenshots: the Android production banner unit ending /6937828493 has Partner bidding checked. The app uses direct AdMob banner requests, not a third-party bidding integration. Google explicitly disallows partner bidding units for AdMob Network-only requests (https://support.google.com/admob/answer/12436136). Serving type cannot be changed after creation (https://support.google.com/admob/answer/12374122). Next: user creates a standard Android banner with Partner bidding unchecked and supplies the new unit ID; replace only Android production banner ID, verify, then separately authorize release. Do not delete the old unit. Successful serving after replacement remains unverified.
- App settings screenshot independently confirms expected AdMob app ID and Play package, app verification completed, readiness Ready, and no app frequency cap. Prior speculation about incomplete app verification is superseded by this evidence.
- Subsequent connected-device inspection confirms installed version 4.0.7 (10). App-scoped Logcat shows the expected production Android banner unit and four `Ad failed to load : 3` responses (Google Mobile Ads NO_FILL). This establishes that these attempts reached ad loading after consent; the earlier pre-request consent-failure hypothesis is not the cause of these observed attempts. No detailed response reason was present in the filtered logs. Do not claim zero actual requests based on missing report rows.
- Next: inspect AdMob Android app verification/readiness and serving details directly (user screenshot), then Ad Inspector response details/test-device checks if needed. NO_FILL alone does not distinguish inventory availability from account/app serving restrictions. Do not bypass consent or assume a code release will fix NO_FILL. No device identifiers or raw logs retained here.
- User confirms the affected app is installed from Google Play; screenshots show production version 4.0.7 (10). User reports no Android row in app-ads.txt and no Android request records in AdMob reports; console settings are reported correct, not independently verified.
- Local Android copied web assets are dated August 24 and their source map contains older AdMobBanner code, including the shared iOS test ID. Current source has platform-specific test IDs. Copied assets are not proof of the exact Play artifact contents. The Android plugin may substitute its own test ID depending on test-device registration.
- Both inspected banner sources use the expected production Android unit and gate requests on UMP consent. Consent update rejection aborts the request; setup failures do not enter the banner FailedToLoad retry path. No runtime error has yet established the actual production cause.
- Located ADB at C:/SDK_Dev/platform-tools/adb.exe using android/local.properties. `adb devices` reports no attached devices. Next required evidence: installed Play app version and focused ad/consent runtime errors after opening a schedule screen.
- Read-only verification: Android manifest app ID, plugin registration, current banner source, copied source map, native consent implementation, and device enumeration. No application code changes, build, sync, push, or deployment performed in this follow-up.
- Google rejected the Korean store title for impersonation. User selected ClassDay Calendar for both stores and plans Apple name change with the next version. Local rename has not been performed; preserve existing package/bundle ID. Store title issue does not establish the cause of missing ad requests.

## Android advertising investigation (2026-09-17)

- User reports ads not appearing in the Android app; installation source and affected ad format await clarification.
- Fixed the banner test-mode ID selection: Android now uses Google's Android adaptive banner test unit; iOS retains its own test unit. Production IDs are unchanged. This does not establish the cause of missing production ads.
- Android manifest contains the AdMob app ID and the native Gradle settings include the AdMob plugin.
- Public `/app-ads.txt` returned HTTP 200 with the expected publisher entry. AdMob console verification/readiness and the Play developer website association remain unverified.
- No Android device was attached in ADB, so runtime ad requests could not be inspected.
- Verification: 7 suites / 30 tests passed; production web build passed with known AdMob source-map warnings. No native build, push, or deployment performed.
- Next: obtain installation source, AdMob Android app approval and app-ads.txt statuses, then inspect device ad errors if needed.

## Product direction

This is one existing Capacitor/React application being extended from a BLC-only calendar into **NCOA Schedule Calendar** for both BLC and KTA. It is not a separate KTA app. The same codebase targets Web/PWA, iOS, and Android.

- App/bundle ID: `dev.pages.blccalendar` (must remain unchanged)
- Public web host: `https://blc-calendar.pages.dev`
- Current public privacy page: `https://blc-calendar.pages.dev/privacy`
- Google Play listing app name: `NCOA Schedule Calendar`
- Google Play developer name supplied by the user: `eomjun`

## Repository and release safety

- The user requires **no GitHub push unless explicitly requested**.
- The worktree contains many intentional uncommitted changes. Never discard or overwrite unrelated changes.
- The only recent explicitly authorized push was commit `114557e`, which changed only `public/privacy.html` to match the Google Play app/developer identity.
- The live privacy page was verified to show `NCOA Schedule Calendar`, `eomjun`, package ID `dev.pages.blccalendar`, and the August 25, 2026 update date.
- Google Play had been reviewing the obsolete GitHub Pages URL `https://wbkim123.github.io/BLC_calendar/privacy.html`, which still showed the old identity. The user was instructed to replace it in Play Console with the Cloudflare privacy URL above.

## Architecture and authorization

- `src/config/academies` contains academy configuration.
- BLC retains legacy root database paths; KTA uses its academy-prefixed database paths.
- `src/features/auth/accessCodes.ts` resolves login profiles. Do not repeat code values in documentation.
- Authorization uses `AccessProfile` with academy scope, `accessLevel`, and permissions.
- Relevant access levels: `NCOA_MANAGER`, `SCHEDULE_IMPORTER`, `SENIOR`, and `STUDENT`.
- NCOA managers can switch academy. Other users remain scoped to their authorized academy.
- Student search and calendar data remain limited to the assigned cycle.

## Completed local features (mostly uncommitted)

### KTA schedule support

- KTA-specific PDF parsing is separate from BLC parsing.
- Parser handles KTA table layout, cell colors, white-cell ACA locations, DFC/CHOW rules, NLT display times, Duty Section notes, Duty NCO ranges, ALL HANDS ranges, simultaneous platoon events, abbreviations, and normalized repeated values.
- KTA re-import replaces corrected parsed days instead of appending stale events.
- Always preserve preview-before-confirm behavior.

### Calendar and search

- Role/academy-aware Event Search exists under `src/features/event-search`.
- BLC searches only BLC; KTA searches only KTA.
- Students search only their cycle; authorized staff can choose current/all cycles.
- Search results open and highlight the selected event.
- Dark Mode styling was added for the search modal, result cards, filters, inputs, and time badges.
- Administrators can edit a selected day's DAY label.

### Login and settings

- Login heading is `NCOA`.
- Access-code input includes a fixed-position show/hide eye button. Its inline transform prevents the global active-button scale rule from moving it vertically.
- Label is `Keep Login`.
- Dark Mode and notification settings are retained.

### Ads

- Native banner IDs remain in `src/components/AdMobBanner.tsx`.
- Website/PWA returns `null` for AdMob and reserves no banner space.
- A student-only native interstitial flow is prepared under `src/features/ads`:
  - triggered only after Event-to-Calendar returns;
  - every third eligible return;
  - 10-minute cooldown;
  - navigation is never blocked by an unavailable ad;
  - production remains disabled until separate Android/iOS interstitial IDs are provided.
- Existing UMP consent/ATT and Ad Privacy Choices behavior must remain intact.

### Web access after store launch

- On the public website, non-administrator accounts are forced into TV View.
- Native Android/iOS display-mode behavior remains unchanged.
- Administrators retain AUTO/TV selection on the website for browser-based testing and schedule management.
- Website/PWA AdMob remains fully suppressed; only native builds can render AdMob banners.

### FAQ chatbot

- `src/features/chatbot/NcoaChatbot.tsx` provides a floating bottom-right help chatbot on Calendar and Daily views for Web and native apps.
- It is local FAQ logic, not an external generative-AI service; questions are not sent to an AI backend.
- It answers basic schedule, search, notification, notes, location/uniform/Duty NCO, import, access, Dark Mode, ads/privacy, and support questions.
- Suggested FAQs remain visible and are dynamically ranked using recent questions, academy, role, and cycle.
- Recent topics are temporarily excluded; BLC/KTA and student/admin suggestions differ.
- Future improvement: pass the full `AccessProfile` rather than only `role` so recommendations can distinguish NCOA managers, schedule importers, seniors, and students without exposing raw codes.

### Release preparation

- `scripts/release-readiness.cjs`, `docs/release-checklist.md`, and package scripts (`release:check`, `release:verify`, `native:sync`) exist locally.
- Most recent full verification after chatbot recommendation changes: **7 test suites / 30 tests passed**, and the production web build succeeded with only known AdMob source-map warnings.

## Icons and store-policy issue

- Google Play rejected a prior high-resolution icon for possible government-entity impersonation/confusion.
- The original BLC icon was restored locally at the user's request, but it also contains prominent military rank imagery and remains risky for Google Play.
- The user later selected a safer generic 512×512 calendar/clock icon named `NCOA_Schedule_Icon_512x512.png` in Downloads. It has no government seal or rank insignia and was recommended for the Play Store listing.
- That safer icon has **not yet been applied to local iOS/Android/Web native assets**. Do not assume the local native icon is final.
- Store description should clearly state that the app is independently maintained and is not an official U.S. Government or Department of Defense application.

## Known release blockers / decisions

- Confirm Google Play has been updated to use `https://blc-calendar.pages.dev/privacy`, not the old GitHub Pages URL.
- Confirm Google Play review outcome after privacy URL and safe high-resolution icon changes.
- Android next release needs `versionCode >= 11`; version name requires user approval.
- iOS next build must exceed the App Store build number reported by the user (50); marketing version requires user approval.
- Android `google-services.json` was previously missing; confirm before relying on Android push notifications.
- Final Android AAB must use the existing Play upload key/signing workflow.
- Obtain separate production interstitial ad unit IDs before enabling native popup ads.
- Decide and apply the final safe icon across Web, iOS, Android, and store assets before the next native release.
- Backend Firebase rules/functions for KTA administrator writes must be reviewed and explicitly deployed before production use.

## Useful files

- `src/App.tsx` — application orchestration, academy/data selection, login, notifications
- `src/types/academy.ts` — access profile, access levels, permissions
- `src/features/auth/accessCodes.ts` — access resolution (contains sensitive operational values; do not quote)
- `src/features/schedule-import/` and `src/features/kta/` — academy PDF import/parsing
- `src/features/event-search/` — scoped event search
- `src/features/chatbot/` — FAQ answers and recommendation algorithm
- `src/features/ads/` — prepared student interstitial logic
- `src/components/AdMobBanner.tsx` — native banner, UMP, ATT, privacy options
- `database.rules.json` and `firebase-functions/index.js` — pending backend authorization changes
- `docs/release-checklist.md` — release procedure and manual checks
