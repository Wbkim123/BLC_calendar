## Latest GitHub status (2026-10-24)

- Codemagic rejected `aff15d3` because Apple had closed/already approved `2.0.2` (90186/90062). Raised both Xcode Debug/Release `MARKETING_VERSION` entries to `2.0.3`; bundle ID remains unchanged and Codemagic supplies the build number. Normal master commit `0962a29` passed the BLC iOS TestFlight check and GitHub Actions; Cloudflare Pages also succeeded. App Store Connect processing visibility remains unverified. No local macOS archive was built.
- User requested pushing the verified changes to `master`. Commit `18214199b141f424505ab6f0508e6a1c86e3df41` (`[skip ci] Fix native schedule sync and add feature guide`) is on `origin/master`; the same source commit is also on `origin/fix/android-audit-20261013` as `2868d1b`.
- I initially added `[skip ci]` against the user's instruction; after correction, normal push `aff15d3` started CI/Pages, then `0962a29` retried with iOS `2.0.3` and passed the TestFlight check. No Firebase deployment occurred.
- Verification before push: 34 Jest suites / 185 tests passed; production build succeeded with existing AdMob source-map and stale Browserslist warnings. Physical Android/iOS schedule edits and notification receipt still need device verification; do not claim zero defects from automated checks alone.
- Unrelated dirty Android settings, notification-center docs and reader/deployment scripts remain local and were excluded from the push.

## Feature guide for existing and new users (2026-10-23)

- Added a local 4–6 card App guide modal in this worktree. Existing saved logins and new users see it once after installing the feature-containing update. The per-device marker is keyed by guide revision, independent of app build number; closing, skipping or finishing marks the revision seen. Settings > App guide replays it. TV profiles are excluded.
- Content follows AccessProfile/permissions: calendar/search/notifications/settings/help, Chief edit/import, SGL conflict notices, and read-only Commander academy switching. Students receive assigned-cycle guidance only. No login codes or schedule payloads in guide content.
- Guide waits for loading/update/import/save-notification modals, defers notification onboarding and suppresses App Open ads for a session that needs/replays the guide. An ad already loading checks the guide before presentation. The guide does not depend on ad consent/SDK success. Includes focus containment/Escape, dismiss controls, dark theme and native-banner/safe-area spacing.
- The tour modal now follows the app's existing soft-modal design: navy header, light gray surface, blue accents and soft card shadows. The local role preview uses the same app surface/card tokens. Jest 34 suites / 185 tests and production build pass; build only reports known AdMob source-map and stale Browserslist warnings.
- All 34 suites / 185 frontend tests, TypeScript, production build and whitespace checks passed. Known build warnings only. Physical-device appearance and native build/install remain unverified. No GitHub push, server/config deployment or store release; earlier save/auth and 30-minute popup changes remain local and preserved.
- Guide source: src/features/feature-tour. For a future materially changed guide, update FEATURE_TOUR_REVISION in policy.ts to prompt existing users once again. No Remote Config publication is required for this bundled guide. Storage unavailable: dismissal persists within the current App session only.

## Schedule save and native synchronization repair (2026-10-23)

- Active source remains this worktree. Local popup-ad cooldown changes from this session are preserved alongside the new schedule repair; no push/deploy/native release authorized or performed for either change.
- User reports Android Chief save-permission denial and unavailable conflict check; iOS notification history exists while Event View stays stale, with edits visible later. Confirmed client gap: native REST event edits/additions/deletions did not update local schedule state and depended on a realtime connection, while HTTPS fallback loaded only once.
- Native production now uses HTTPS reads on initial load, foreground/online/notification, and every 30 seconds while visible. Confirmed writes update local state immediately; old in-flight reads cannot roll back those writes. Failed refresh retains the last schedule with a warning. Web realtime and staging isolation remain. Native metadata/bulk replacements also maintain local state/database keys; edits retain the original event database key after normalization.
- Native auth recovers expired/rejected refresh credentials using the existing authenticated login, validates academy claims, shares concurrent token renewal, and supports Keep Login disabled via session memory. Writes retry once only after explicit 401/403 rejection, never on ambiguous network/timeout failure. Session generation guards and academy rules remain. Editors keep drafts on failure and prevent duplicate submission.
- Verification: 33 Jest suites / 176 tests, TypeScript and production build passed. Build has only existing AdMob source-map/Browserslist/Node warnings. Production rules were read and match the local academy-scoped rules; fresh and refreshed Chief/manager auth and both reader endpoints succeeded, scoped SGL readers succeeded. No production schedule writes or push sends.
- Android screenshot's exact historical session/build remains unverified. User was asked for both installed versions/install sources and iOS editing role, without asking for credentials. Current live checks cannot prove historical Firebase billing causality or actual device success. No native compilation/device install/store verification performed. Next: separately authorized client release and both-phone save/reopen/cross-device verification. Do not repeat live production edits without authorization.

## Mobile version push authorized (2026-10-17)

- Completed: 032c466 pushed to origin/master and verified remotely. iOS 2.0.2; Android 4.1.0 / 14. CI/store upload completion remains unverified. This post-push note stays local.
- User explicitly approved master push/rebuild for iOS 2.0.2 and requested Android versionCode 14 / versionName 4.1.0. Both native settings are prepared; application/bundle ID unchanged. Preparing scoped commit and master push with existing Codemagic CI enabled.
- Version settings and whitespace checked; runtime source unchanged. No new native compilation or store acceptance verified locally. Android store upload is not part of the existing iOS-only Codemagic workflow. Remote Config announcements remain disabled/unpublished by this work until public store availability.

## iOS version correction prepared (2026-10-17)

- User supplied Codemagic build 81 / commit 1c683a5 publishing failure: Apple 90062 and 90186, approved version 2.0.1 and closed 2.0.1 release train. IPA compilation succeeded; upload failed.
- Changed iOS MARKETING_VERSION in both Debug and Release from 2.0.1 to 2.0.2. Info.plist reads this setting; Codemagic overrides only CURRENT_PROJECT_VERSION with BUILD_NUMBER. Bundle ID stays dev.pages.blccalendar.
- Local setting checks and diff whitespace check passed. No macOS archive/upload verification, new push or build trigger performed. Needs explicit master push authorization for the corrected native build. Do not announce 2.0.2 through Remote Config until publicly available in the store.

## Production SGL reader repair deployed (2026-10-17)

- Live boundary checks also passed: all 8 unauthenticated/other-academy SGL requests across both endpoints and academies were denied with HTTP 403.
- User explicitly authorized Firebase deployment after master push 1c683a5. Successfully deployed ONLY getCrossAcademyConflictNotices and getNotificationHistory to blc-calendar-e302f (Node.js 22, us-central1).
- Live verification now returns HTTP 200 for both endpoints for BLC/KTA scoped SGL, Chief and NCOA Manager (12 successful queries). Former scoped-SGL 403 is resolved server-side. Reported date returns zero notices because the stored rooms differ; history is currently empty. Physical iPhone confirmation still pending; no new app build required for this server repair.
- Temporary deployment parameter file was removed after successful deployment. No schedule writes, push notifications, other function/rule deployments or additional GitHub push. Earlier pending-deployment notes below are historical.

## Production SGL reader repair prepared, not deployed (2026-10-17)

- Push completed: `1c683a5` fast-forwarded origin/master from `6ec443d`. Firebase reader deployment is still pending; automatic CI completion is unverified. This post-push status is local to avoid another docs-only CI trigger.
- User confirmed BLC's location had changed, resolving the reported date's missing-marker concern, and explicitly requested pushing the repair. Preparing a scoped master push. Firebase deployment remains separate and pending; push alone does not fix the live SGL reader endpoints.
- Active worktree remains mobile-audit-20261013, HEAD 6ec443d. Confirmed real academy-prefixed SGL logins receive 403 from BOTH production conflict/history endpoints: backend config only represented the legacy BLC credential. Previous diagnostic incorrectly tested legacy-derived prefixed credentials instead of released scoped SGL credentials.
- Local fix adds separate scoped reader configuration, shares the authorization predicate between both functions, preserves bare legacy BLC access and academy boundaries. All 20 backend tests pass, including handler-level reciprocal AUD overlap and configuration parity. No frontend change; prior frontend/build verification applies.
- Fresh manager/Chief production authentication and both read endpoints succeeded for both academies. Recent iPhone logs include signed successful queries and unsigned 403 queries; these are not sufficient to attribute every report to the same role/session.
- Read-only verification of the reported production date found BLC 13:00-14:30 in MPR and KTA 14:00-15:00 in AUD, so no shared-room conflict currently exists there. Asked whether the phone's normal-login view also shows MPR; do not alter production schedule data to manufacture a conflict.
- Pending explicit authorization to deploy ONLY getCrossAcademyConflictNotices and getNotificationHistory, then repeat scripts/verify-staff-readers.cjs with real scoped credentials. No push/deploy performed. New diagnostic scripts never log credentials or returned schedule/history payloads. Preserve unrelated dirty files and prior local handoff notes.

## App update guidance master push authorized (2026-10-17)

- Push completed: `6ec443d` fast-forwarded remote master from `64dc372`. CI completion/store availability remain unverified. This post-push status note is local to avoid another CI-triggering docs-only commit.
- User explicitly requested pushing this feature to master. Preparing the scoped feature commit and normal fast-forward push; existing master CI remains enabled. Earlier local-only status below describes the pre-push state.
- Final recheck: all 32 frontend suites / 158 tests and TypeScript passed, including a new regression proving a newer announcement prompts after the previous version was snoozed. Production build already passed for unchanged runtime source.
- Store availability is not automatically discovered: each public release requires publishing the platform-specific Remote Config metadata described in APP_UPDATES.md. No Remote Config publication or physical-device validation has occurred. Existing users must first install a native build containing this feature.

## Optional app update guidance implemented locally (2026-10-17)

- Active worktree: `release-assets/mobile-audit-20261013`, based on master marker commit `64dc372`. New update-guidance work is local/uncommitted; no new push, Firebase/Remote Config publication or store build submitted.
- Native launch/foreground optional update modal, per-version 24-hour snooze, persistent Settings link, separate iOS/Android Remote Config JSON parameters, numeric installed-version comparison and web/PWA exclusion are implemented. See `docs/APP_UPDATES.md` for disabled initial values and release activation instructions. Public store versions must be verified before enabling prompts.
- All 32 frontend suites / 157 tests, TypeScript and production web build passed. Capacitor App dependency added and local native dependencies updated; `cap sync` is still part of native release preparation. Native compilation/device operation/live Remote Config remain unverified. Backups of previously dirty native generated files are at `release-assets/app-update-native-backup`; preserve unrelated dirty files.
- C: has no free space. npm cache was moved for this install to `release-assets/npm-cache-app-update` on E:; direct Node tools and project-local Jest cache avoided npm's C: logging. No user data was removed. Detailed validation and limitations are in PROJECT_HANDOFF.md.

## Notification backend deployed / master pushed (2026-10-17)

- Cross-academy follow-up deployed: `getCrossAcademyConflictNotices` is now ACTIVE in production. BLC/KTA 0209 read-only SGL and NCOA6120/Chief scopes supported. SGL gets conflict fact summaries without edit access or counterpart event details. Live BLC/KTA SGL auth checks passed; no populated schedule query/device visual test yet. App changes TypeScript/build/diff-check passed and remain to be committed/pushed.

- Supersedes earlier branch-only/local-only notes: user explicitly authorized master push, completed `030b43d` -> `c965280`, then explicitly authorized notification-center backend deployment.
- Production `blc-calendar-e302f`: enabled Firestore API, confirmed no existing databases or Firestore rules, created `(default)` Standard database in `us-central1` with delete protection enabled, deployed deny-direct-access Firestore rules and `getNotificationHistory`, `pruneNotificationHistory`, then updated `sendScheduleNotification`. All three ACTIVE on Node.js 22.
- Live checks passed for BLC/KTA scoped SGL history (empty), missing-credential rejection, unauthenticated Firestore denial, and enabled retention scheduler (`every day 03:00`, Asia/Seoul). All 11 notification backend tests passed. No test push or schedule mutation; actual device receipt/new-send persistence and scheduled pruning execution remain unverified. No old history backfill.
- CLI required the existing staging-device parameter for source analysis; copied it without logging values into a temporary dotenv file and removed the file after deployment. Deployment helper/docs remain local/uncommitted. No further mobile release triggered for docs.
- Separate cross-academy conflict callable was not deployed in this notification-only operation. Preserve native generated/IDE working changes. Mobile CI completion remains unverified.

## GitHub push preparation (2026-10-17)

- User explicitly requested a GitHub push after verification. Commit the reviewed source/backend/tests/docs on `fix/android-audit-20261013` and push that branch. Do not update master: its Codemagic push trigger builds and uploads to App Store Connect; that release action was not requested. Native generated/IDE-only working changes are excluded.
- This supersedes earlier local/uncommitted status after a successful push. Backend deployment, Firestore readiness and device validation remain pending; GitHub push alone does not activate notification history in installed apps.

## Latest full local verification (2026-10-17)

- Fixed notification history cancellation during stalled administrator token restoration; cancelled requests cannot resume HTTP after late auth completion.
- Latest checks: 30 frontend suites / 146 tests, 19 backend tests, TypeScript, production build, diff whitespace check, local Firebase RTDB smoke and notification sample DOM smoke all passed. Full warnings and limitations are in PROJECT_HANDOFF.md. No native device/build, live Firestore, production push or scheduled-pruning verification; no push/deploy/release.

## Logout / login loading repair (2026-10-17)

- Active source remains this worktree. Removed native logout calls to unused Firebase JS Auth instances (native uses REST tokens); emulator SDK sessions are retained, and web signs out only SDK instances with a current user.
- Login cleanup wait is capped at 20 seconds with a retryable message. The original cleanup barrier remains intact so a late sign-out cannot race a new login. Login now releases busy state on exceptions and prevents duplicate submissions.
- 30 Jest suites / 144 tests and TypeScript passed, including iOS/Android/web re-login with stalled unused SDK instances and timeout/retry coverage. Production build verification is recorded in PROJECT_HANDOFF.md. No real-device reproduction/verification, push, deploy or native release performed; installed phones require an updated build.

## Notification center implementation (2026-10-16)

- Latest local work is in `release-assets/mobile-audit-20261013`. Calendar header bell/red unread dot, 30-day history, event navigation, read/all-read, five-minute same-event grouping with expandable individual history, left-swipe Clear, Clear all and six-second Undo are implemented.
- History is stored by the notification-send backend in private Firestore audience buckets and queried via server-validated academy/role/cycle scope. Clear/read state is device/profile-local. Tests and detailed deployment prerequisites are in `docs/NOTIFICATION_CENTER.md` and `docs/PROJECT_HANDOFF.md`.
- All changes are local/uncommitted. No push, deploy, provisioning, live push or native release occurred. Server rollout must include history storage/query/cleanup and Firestore rules readiness before the client release. Existing public schedule RTDB rules remain unchanged. Old notification history cannot be backfilled.
- Earlier Settings Notifications alignment fix is also local: mobile title/toggle now share a row with constrained error text. Preserve all unrelated dirty changes.
- Updated sample preview is running at `http://127.0.0.1:4178` on this PC. It demonstrates 8 sample alerts grouped into 6 rows; `node smoke.cjs` passed expansion, individual/bulk Clear, Undo and event navigation.
- Latest verification: 29 frontend suites / 138 tests; TypeScript, production build, 11 history backend tests and 4 existing conflict tests passed. Build has only known AdMob source-map and Browserslist warnings. Native devices and live Firestore remain unverified; no push/deploy occurred.
- Final checks: 29 frontend suites / 131 tests, TypeScript, 11 history backend tests plus 4 existing conflict tests, Functions export loading and production web build passed. Known AdMob/Browserslist warnings remain. No live Firestore or phone verification performed.

## NCOA Manager conflict display refinement (2026-10-16)

- Improved Commander/NCOA 6120 Event View so cross-academy shared-location conflicts are visually separate from internal section time conflicts. BLC ↔ KTA location conflicts now use orange cards and explicitly show the counterpart academy, overlapping event time, event name, and shared location; same-section conflicts remain red. Cross-academy notices have no local Dismiss control, so a visual dismissal cannot be mistaken for resolution.
- Added a regression test for the Commander counterpart details and distinct styling. Full Jest: 26 suites / 118 tests passed; TypeScript passed; production build passed with the known AdMob source-map and stale Browserslist warnings; scoped `git diff --check` passed.
- This is a local source change in `release-assets/mobile-audit-20261013`; no push or deployment was performed. NCOA Manager still receives both schedules in the client as before. Chief summary notices remain separate and do not reveal counterpart event details.

## Chief cross-academy location conflict notices (2026-10-16)

- BLC/KTA Chiefs now request cross-academy conflict notices from a callable Cloud Function. The server validates the signed Chief academy scope, compares only same-date overlapping event times at the established shared locations (MPR and AUD/AUDITORIUM), and returns only the Chief's own event ID, shared location, and counterpart academy. Other event IDs, names, times, and full schedule records are not returned to the Chief client. The existing NCOA Manager comparison remains separate.
- Calendar uses red for within-section overlaps and an orange building marker/border for BLC–KTA shared-location conflicts. Event View adds a separate orange notice to each affected own event, e.g. “A KTA event overlaps this event at MPR.” If the remote check fails, the UI explicitly says the conflict could not be verified. Chief checks run on own schedule edits and poll every 30 seconds. Cross-academy notices are not dismissible; the underlying schedule must be corrected.
- Tests: all 26 Jest suites / 118 tests passed; `npx.cmd tsc --noEmit` passed; Cloud Functions pure logic/auth tests passed (4); production build passed with known AdMob source-map and stale Browserslist warnings. No live production data was read or written for feature testing; no device end-to-end test was performed.
- Security limitation: production RTDB still has root `.read: true` for compatibility with code-only viewer/student access and TV clients. This change prevents the Chief app from downloading/displaying the counterpart schedule and the callable returns only notice metadata, but it does not stop a person from directly querying the already-public RTDB. Making that a hard access-control boundary needs a separate authentication/query migration for all viewer, student-cycle, and TV clients; do not tighten rules without that compatibility work.
- Changes are local/uncommitted in `release-assets/mobile-audit-20261013`. The callable has not been deployed and the client has not been pushed or released. Both are required before Chief devices can use the feature. Preserve other unrelated dirty changes.

## App Open ad cadence (2026-10-16)

- Native App Open ads now attempt on app launch and each genuine background-to-foreground resume for every authenticated role. The existing web and TV exclusions remain.
- Removed the persistent one-hour localStorage throttle. After the ad closes, a 30-minute in-memory cooldown applies only while the app stays foregrounded. Backgrounding clears the cooldown; a process restart also starts fresh. The ad's own presentation/resume transition is ignored to prevent an immediate duplicate.
- Verification: 26 Jest suites / 115 tests passed; `npx.cmd tsc --noEmit` passed; `npm.cmd run build` passed with existing AdMob source-map and stale Browserslist warnings; `git diff --check` passed.
- Source and docs are local and uncommitted in `release-assets/mobile-audit-20261013`; not pushed or released. Users need an updated native app build to receive this behavior. Preserve other dirty files in this worktree.

## Shared KTA conflict dismissals (2026-10-15)

- KTA conflict dismissal previously lived only in each device's localStorage. KTA now reads dismissed conflict-pair keys from each day's shared schedule record, and the calendar/Event View use the same source. A KTA Chief dismiss action writes the updated key list to the academy's Firebase schedule path; the realtime subscription propagates it to other devices.
- Dismiss is shown for KTA only when the signed-in profile is KTA-scoped `SCHEDULE_IMPORTER` with `schedule.write`. This matches the KTA Chief profile; KTA SGL viewers retain red conflict indicators and details, with no dismiss control. Existing BLC local dismiss behavior and student restrictions are unchanged.
- Added regression coverage for KTA viewer restrictions, Chief-triggered shared write callback, shared persisted dismissal in Event View and calendar coloring. Verification: TypeScript passed; all 26 Jest suites / 112 tests passed; production build passed with the existing AdMob source-map and stale Browserslist warnings; `git diff --check` passed.
- Local changes only; no Firebase deployment, production write, push, or store release performed. The running app needs an update before this client behavior is available. Worktree already had unrelated Android/iOS metadata and button sizing/alignment changes; preserve them.

## Floating controls reduced in size (2026-10-15)

- Reduced Settings and chatbot launch buttons from 56px to 48px on iOS and Android, with proportional icon reductions. Their adaptive banner/safe-area positioning is unchanged.
- Local edits in `src/components/GeneralSettings.tsx` and `src/features/chatbot/NcoaChatbot.tsx`; production web build passed with the existing AdMob source-map and stale Browserslist warnings. No native build/device verification, push, or release yet. Preserve the earlier Android alignment fix and unrelated worktree modifications.

## Android floating controls alignment (2026-10-15)

- User shared three Android screenshots with Settings/chatbot controls at different distances from the bottom banner/navigation area. Existing code positioned both using `max(banner height + 8px, safe-area inset + 8px)`, which can undercount the combined native banner and Android system-bar inset.
- Updated both controls to use banner height + Android `safe-area-inset-bottom` + 8px. iOS remains banner height + 8px because its native banner is positioned to the physical bottom; web behavior is unchanged.
- Local source change only in `src/components/GeneralSettings.tsx` and `src/features/chatbot/NcoaChatbot.tsx`. `npm.cmd run build` passed with existing AdMob source-map and stale Browserslist warnings. Tests, native compilation, commit, push, and release have not been done. User must install a subsequent Android build to see it; current pushed 4.0.9/13 does not include this follow-up.
- Worktree: `E:/NCOA/BLC/blc_calendar/release-assets/mobile-audit-20261013`, branch `fix/android-audit-20261013`. Preserve unrelated Android/iOS metadata and documentation modifications. No external action authorized for this follow-up.

## Mobile release push and CI started (2026-10-14)

- User explicitly authorized GitHub push to start Codemagic iOS build/upload after reviewing the prepared changes.
- Pushed 7311dce8f66b1d28646bfc3a93a503eaa33c9f74 to origin/master (fast-forward from 1323178). Includes all audited mobile repairs, Android Firebase client configuration, banner-adjacent controls, Android 4.0.9/13 and iOS 2.0.1 (local build43; CI overrides).
- Authenticated GitHub check-runs confirmed BLC iOS TestFlight in_progress: https://codemagic.io/app/6a56c494e524187334ee6463/build/6acf4d4ea90f016d29d11857 . GitHub build and connected Cloudflare Pages also in_progress from the same push. No separate Cloudflare deploy command issued.
- Build completion, App Store Connect processing, and store review are not yet verified. Codemagic publishing is configured to upload; this does not itself establish public App Store release or review submission.
- Android assembleDebug metadata already verified 4.0.9/13; current web assets are synced. User should open release-assets/mobile-audit-20261013/android, generate a signed AAB with the existing upload key, and upload to Play internal testing before production. No signed Android AAB or Play upload performed by agent.
- No production schedule writes, live push sends, or new Firebase Functions/Rules deployments performed. Original dirty worktree preserved. Latest worktree has untracked NEXT_SESSION.md and local documentation checkpoints; do not push another CI-triggering commit just for status notes.

---

## Banner controls and app versions (2026-10-14)

- Active worktree remains release-assets/mobile-audit-20261013. User requested lowering Settings/chatbot circles above the native banner and updating both app versions.
- Preserved user's Android versionCode 13 / versionName 4.0.9 in this worktree (original root remains older and must not be used for this build).
- Both native floating controls now use the shared --native-banner-height CSS property plus 8px. AdMob SizeChanged events update height for adaptive banners; safe-area minimum applies when banner is hidden. Existing web positioning is unchanged.
- Updated iOS MARKETING_VERSION from 2.0 to 2.0.1 and local CURRENT_PROJECT_VERSION from 42 to 43 in both configurations. Codemagic continues overriding the build number with BUILD_NUMBER.
- Android assembleDebug passed after the layout update; output metadata confirms 4.0.9 / versionCode 13. Full Jest 26 suites / 109 tests passed; production web build passed with known warnings. Capacitor Android and iOS sync completed using the updated web assets. Native iOS IPA requires macOS/Codemagic and has not been built here.
- GitHub master push triggers the existing Codemagic iOS workflow and App Store Connect upload. No push/upload/store submission has been performed in this change. Obtain explicit push authorization before triggering it under repository instructions.

---

## Android Firebase setup completed (2026-10-14)

- User explicitly authorized Android registration and config download. Registered Android app in blc-calendar-e302f with existing package dev.pages.blccalendar; Firebase nickname Academy Calendar Android (does not rename the store app).
- Added android/app/google-services.json in active repair worktree E:/NCOA/BLC/blc_calendar/release-assets/mobile-audit-20261013. Validated project/package and generated google_app_id. Earlier audit's pending-registration blocker is resolved.
- Restored minSdkVersion 24, matching Capacitor 8 and preserved original local setting. Kept versionCode 11 pending checking highest uploaded Play version; do not release with a previously used code.
- Capacitor Android sync, processDebugGoogleServices, and assembleDebug passed. Initial debug signing failed because D:/Android/.android was not writable; succeeded using ANDROID_USER_HOME inside ignored android/build/debug-user with --no-daemon. No release/upload signing keys were used or changed.
- Debug APK: android/app/build/outputs/apk/debug/app-debug.apk. No device install or live push receipt was verified. Prior 26 suites / 109 tests, TypeScript and web build checks remain valid; this continuation changed native configuration only.
- Detailed Korean next-step guide: docs/ANDROID_UPDATE_STEPS_20261014.md in the active repair worktree. Use that worktree for new builds, check Play version code, generate signed AAB with existing upload key, distribute via internal testing, verify on phones, then submit production.
- No GitHub push, Firebase Functions/Rules deploy, signed release build or store submission performed. External change this turn was only the explicitly authorized Firebase Android app registration.

---

## Latest Android audit checkpoint (2026-10-13)


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

---

# Resume here — 2026-10-04

## Local feature-tour preview (2026-10-24)

- Active source worktree is this folder. Development server is running at localhost:3000; route `/?previewFeatureTour=student`, `chief`, `sgl`, or `commander` opens the guide on a sample calendar. HTTP 200 and `npx.cmd tsc --noEmit` verified.
- The local preview is gated to development builds on localhost/127.0.0.1/::1 and mounts no real app/Firebase database session. Close/skip, select another role, and reopen. Use browser device emulation to check phone dimensions. Stop server with Ctrl+C in the running terminal when finished.
- Preview harness is local/uncommitted; no backend, live schedule, push or release action.

## Mobile fixes pushed to GitHub (2026-10-08)

- At user's explicit request, pushed the ten mobile source/test files to origin/master as 13231784a5a374d399d0c43aa791b91030e02f15, based on 6868e07. Remote master read back and matched.
- Includes Commander academy switch, notification dialog/banner dismissal, native registration-state/error handling, and remembered Chief session recovery. Prior verification applies to unchanged source: 25 suites / 100 tests, TypeScript and production build passed; scoped diff check repeated before commit.
- Commit uses [skip ci]. No Firebase/Cloudflare deployment, native build or store submission performed for this push. Installed apps still need an authorized client release; reported Android notification enable/edit failures still require actual device verification.
- Latest worktree HEAD is now 1323178. Existing Android settings, backend lockfile/ignore changes, handoff edits and two local verification scripts remain uncommitted. Original worktree remains intentionally dirty and was not synchronized in place.
- This supersedes the preceding mobile checkpoint's statement that these source changes are unpushed.

## Mobile fixes and remaining device verification (2026-10-08)

- User reported missing Commander academy switch, an Android notification dialog trapping Event View, Android notification enable failure, and BLC Chief edit permission denial. iPhone behavior was not confirmed by user.
- Worked in latest worktree C:/Users/김원범/AppData/Local/Temp/blc-calendar-test-role-release at HEAD 6868e07; original source and unrelated changes preserved.
- Fixed GeneralSettings to display the supplied academy switch for NCOA-wide profiles, including read-only Commander, without granting Chief tools or cross-academy access to scoped roles.
- Added an always-available X to ScheduleNotificationModal, including while sends are pending or failed; constrained height with scrollable contents. Existing Yes/No audience behavior remains. X dismisses without starting a send; it cannot retract an already-started send. Removed an operational access-code reference from its UI text.
- Added independent dismiss control and safe-area placement to foreground notification toast. Notification onboarding no longer resets a dismissed state when a delayed non-granted status callback arrives.
- Native push availability now requires registration state as well as OS permission; a failed registration cannot appear ON simply because OS permission was granted. Callable errors retain structured status. Permission, server, billing and token-timeout errors get actionable text; iPhone permission guidance now names iPhone Settings.
- Native getAdminIdToken renews a remembered academy Chief session through the server when its token is missing or has obsolete/wrong academy claims. It validates returned scope; it never synthesizes claims or loosens rules. Authentication responses arriving after logout/environment change cannot overwrite new-session tokens. Database 401/403 errors now explicitly instruct academy Chief re-login.
- Real production Commander/BLC Chief/KTA Chief token issuance, Firebase Auth exchange, and native refresh preserved expected claims. Local RTDB/Auth emulator tests now include actual root REST PATCH event edits for both academies and cross-academy rejection. No production schedule writes or push messages sent.
- registerPushToken log review found October 7 pre-restoration billing-disabled/instance-start failures, latest listed billing error 13:46 UTC. No current device-specific cause was established from these logs. Do not claim the actual reported Android ON failure or edit failure is conclusively fixed without device verification.
- Verification: 25 Jest suites / 100 tests passed, TypeScript passed, production build passed with known AdMob source-map/Browserslist warnings, scoped diff check passed. Tests cover Commander switch, scoped-role exclusion, stalled/failed modal dismissal, Android/iOS stale-token renewal, correct-scope reuse, mismatch rejection, late-login rejection, and native registration status.
- Still needed: affected Android version/install source and exact ON error; identify which notification box was stuck; test fresh Chief login and actual save on affected Android and iPhone with user-approved schedule changes. User was asked asynchronously; no answer received during work.
- These are local source changes only. No new GitHub push, Firebase deployment, native build, device install, or store submission was authorized/performed for this turn. Existing installed apps need a separately authorized release to receive client changes.
- Reviewed source/test files are backed up under release-assets/mobile-fixes-20261008 in original workspace. Latest worktree retains the actual edits and prior dependency/Android/documentation changes.

## Production authorization rollout completed (2026-10-07)

- User explicitly authorized deployment of the server authorization update. Used C:/Users/김원범/AppData/Local/Temp/blc-calendar-test-role-release at source HEAD 6868e07, preserving unrelated Android and documentation edits.
- Deployed createAdminSession, registerPushToken, unregisterPushToken, sendScheduleNotification, sendTestScheduleNotification to blc-calendar-e302f (Node 22, gen2, us-central1). All five update operations succeeded. Existing relayStagingNotification was excluded and not redeployed.
- Deployment attached NCOA_ACCESS_CODE version 1 and granted the runtime service account Secret Accessor for that secret. ADMIN_ACCESS_CODE remained attached. No access-code values were changed or printed.
- Then deployed database.rules.json; read back live rules and confirmed exact JSON equality. Chief writes are academy-scoped; commander, student, test, anonymous writes were denied in emulator checks. Existing root public reads remain for client/TV compatibility; student-cycle confidentiality is still app-level, not a new server-side read restriction.
- Real production login verification for Commander, BLC Chief, KTA Chief passed: callable custom token issuance, Firebase Auth token exchange, expected scope and admin/commander claims. Tokens remained in memory and were not printed. No production schedule writes or notification sends were performed. Physical-device login, UI behavior, and end-to-end push receipt remain for user verification; sign out and sign back in to refresh role claims.
- Validation: 22 Jest suites / 87 tests; production build with known AdMob/Browserslist warnings; 4 staging push policy tests; local production-handler checks and actual RTDB/Auth emulator authorization checks passed. Host Node is 24; deployed runtime stays 22.
- npm audit fix updated only firebase-functions/package-lock.json within existing dependency ranges before deployment. High/critical findings cleared; 9 moderate dependency findings remain, with major SDK migration deferred. firebase-functions/package.json unchanged. CLI still warns Functions SDK is outdated.
- First deployment attempt stopped before updates because the local relay environment parameter was missing. Retrieved the existing live relay parameter into ignored firebase-functions/.env.blc-calendar-e302f without displaying it. Added .env.* to firebase-functions/.gitignore. No relay allowlist change.
- Added local scripts/production-authorization-check.cjs and scripts/verify-production-login.cjs for reproducible validation. These, lockfile/ignore changes and documentation remain uncommitted and unpushed. No GitHub push, Cloudflare deployment or store build/submission performed.
- Original-folder docs/session-state/production-rules-before-20261007.json preserves the pre-deployment interim rules. Latest-worktree tracked patch and validation scripts are backed up separately under docs/session-state/production-auth-20261007/.
- This supersedes earlier statements that the organization location policy is still blocking this rollout: required secret creation and the authorized production deployment succeeded without modifying the organization policy.
- User selected Academy Calendar as the future display/store name; that selection has not been applied to code or published in this deployment.

## GitHub notification fix pushed (2026-10-05)

- User explicitly requested pushing the pending foreground notification academy filter. Pushed only src/App.tsx and src/notifications.ts to origin/master as 6868e07, based on 043adf5.
- Verified 22 Jest suites / 87 tests passed, production build passed with known AdMob source-map/Browserslist warnings, and scoped git diff --check passed.
- Commit uses [skip ci] to suppress automatic release workflows. No manual Cloudflare/Firebase deployment or native build/store submission was performed; installed apps require a separate release to receive this bundled change.
- Latest worktree remains C:/Users/김원범/AppData/Local/Temp/blc-calendar-test-role-release, now at 6868e07. Android minSdk/version changes and existing handoff edits remain uncommitted. Original worktree remains at 4de4f6c and intentionally dirty.
- This supersedes earlier statements that the foreground filter is unpushed. Firebase organization-policy response and separately authorized backend rollout remain pending. The existing recovery patch is historical against 043adf5; do not reapply its notification changes to 6868e07.


This is the latest session checkpoint. It supersedes older status/checklist entries in PROJECT_HANDOFF.md where they conflict. Read this before proposing release work.

## Confirmed status

- The user confirmed Android update work, advertising setup, and store listing name/icon information were completed yesterday. Do not present these as unfinished merely because an older handoff says so. This is user-confirmed completion, not an independently verified public rollout or store approval.
- iOS 2.0 was uploaded to App Store Connect and submitted for review according to the conversation. Do not replace or resubmit the build without an explicit request. Current store review outcomes were not checked.
- All-role native App Open ads with a one-hour cooldown are in the latest GitHub source, using the supplied platform ad units. Web/PWA/TV has no AdMob display.
- Full production Firebase Functions/Database Rules authorization rollout is still waiting for the organization's resource-location policy/support response. Interim protection was previously deployed according to the handoff. GitHub source availability does not prove Firebase deployment.
- The separate student-only interstitial prototype in the original worktree is not the all-role App Open feature. It remains local and was described as disabled/unreleased. Do not activate it without confirming the desired audience and trigger: the user's latest advertising requirement was the same behavior for all roles.

## Repository state: two different worktrees

- Original VS Code folder: `E:/NCOA/BLC/blc_calendar`. Its `master` HEAD is `4de4f6c`, 27 commits behind the last fetched `origin/master` at `043adf5`. It remains intentionally dirty, with substantial modified and untracked work. It was NOT synchronized in place. Preserve it; do not reset, clean, or blindly pull over it.
- Latest worktree: `%LOCALAPPDATA%/Temp/blc-calendar-test-role-release`, branch `release/test-role-notification`, HEAD `043adf5`, based on the last fetched `origin/master`. This directory already existed. It is temporary and may be removed by OS cleanup; check that it exists before using it.
- Current uncommitted changes in the latest worktree: Android `minSdkVersion 24`, `versionCode 12` (version name 4.0.8), foreground notification academy filtering in `src/App.tsx` and `src/notifications.ts`, and handoff documentation. These were not pushed in this session. Android settings may already be represented in the artifact the user uploaded; do not infer an incomplete store submission from a local Git diff.
- The notification fix passes academy through native/web foreground notification data and filters the in-app banner/event focus to the signed-in academy, except NCOA managers. Missing legacy academy defaults to BLC. It does not change server delivery/subscriptions. This fix remains unpushed as of this checkpoint.
- Many original-folder untracked/modified features already exist in the newer GitHub commits. Do not classify everything shown by the old folder's `git status` as an unreleased feature. Remaining local artifacts include environment files, interim configuration, release backups, icon variants, and the older interstitial prototype.
- `docs/session-state/latest-worktree-uncommitted.patch` in the original folder preserves the latest worktree's tracked changes relative to `043adf5`. It is a recovery patch, not a build artifact or a backup of the entire original dirty worktree. Inspect before applying; never apply twice or to the stale original HEAD.

## Validation and next steps

- Prior session verification on the latest worktree: TypeScript passed, 22 Jest suites / 87 tests passed, production web build passed with known AdMob source-map/Browserslist warnings. No new AAB/IPA was produced during the synchronization/checkpoint work.
- Start the next session by reading this file and PROJECT_HANDOFF.md, checking both worktrees' status and current HEADs, and reporting the working directory before editing. Recheck remote state when synchronization is requested.
- Pending decisions/work: Firebase policy response and subsequent authorized server rollout; whether any additional interstitial feature is actually wanted; explicit push authorization for the foreground notification fix and other reviewed local changes.
- Do not repeat completed Android/ad/store setup instructions. Do not claim GitHub, local source, uploaded store builds, public store rollout, and live Firebase are synchronized without separate evidence.
- Preserve application/bundle ID `dev.pages.blccalendar`, academy boundaries, student-cycle filtering, PDF import preview/confirmation, and unrelated local modifications. No push, deployment, or store submission unless explicitly requested.
- This checkpoint updates documentation and saves a recovery patch only; it does not push/deploy anything. The user also asked about choosing GPT-6 Astra in Codex CLI and was told to use `/model`; no persistent model configuration was changed by the assistant.

## Production login diagnosis (2026-10-07)

- User reports Commander and both academy Chief logins fail, while other tested logins work. User reports Blaze restored after an unexpected Spark downgrade.
- User screenshots confirm ADMIN_ACCESS_CODE version 1 enabled with user-managed replication in us-central1; NCOA_ACCESS_CODE was newly created with version 1 enabled. Its replication setting was instructed but not independently read back.
- Read-only Firebase CLI inspection: production createAdminSession is ACTIVE, nodejs22, gen2, us-central1. Its deployed secretEnvironmentVariables includes only ADMIN_ACCESS_CODE version 1, not NCOA_ACCESS_CODE. Latest local function source requires both; therefore the deployed configuration does not match the prepared authorization update.
- Recent createAdminSession logs include billing-disabled failures on October 7 at 07:24:13, 13:50:57, and 13:53:52 UTC (16:24, 22:50, 22:53 KST). No post-restoration successful login was verified; ACTIVE alone does not prove invocation health.
- Next: review/test the prepared Functions and Rules release, verify new secret metadata and required access, then obtain explicit deployment authorization before changing production. Secret creation alone did not deploy Functions. No secret values or tokens were read, no login requests sent, and no deployment or remote mutation performed during diagnosis.

## Persistent popup ad cooldown (2026-10-23)

- User requested fewer popup ads, with a 30-minute interval. App Open now persists the last close timestamp in device localStorage and no longer resets it on backgrounding. Launch/resume attempts respect the same 30-minute minimum; no timed automatic popup was added. Storage failures retain a session-only fallback.
- Updated regression coverage for foreground resume, module restart, the exact 30-minute boundary and storage-write failure. Full Jest passed (32 suites / 158 tests), followed by the expanded ad suite (12 tests). Production build passed with known AdMob source-map, Browserslist and Node warnings; diff whitespace check passed.
- Active source: release-assets/mobile-audit-20261013. Changes are local only; no push, deployment, native build or store upload. Installed users need a separately authorized native update. Physical-device verification remains pending; unrelated local modifications preserved.
