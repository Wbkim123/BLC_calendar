## Latest GitHub status (2026-10-24)

- User asked for the reviewed client fixes on `master`. Commit `18214199b141f424505ab6f0508e6a1c86e3df41` (`[skip ci] Fix native schedule sync and add feature guide`) was pushed to `origin/master`; source commit `2868d1b` is also on `origin/fix/android-audit-20261013`.
- I initially added `[skip ci]` against the user's instruction; after correction, normal push `aff15d3` started Codemagic, GitHub Actions, and Cloudflare Pages. Cloudflare Pages and GitHub Actions completed successfully; BLC iOS TestFlight remains in progress at the last check. No Firebase deployment occurred.
- Verification: 34 Jest suites / 185 tests passed and production build succeeded with existing AdMob source-map and stale Browserslist warnings. Physical-device schedule edits and notification delivery remain unverified.
- Unrelated local Android settings, notification-center docs, and reader/deployment scripts were excluded and remain dirty/untracked; preserve them.

## Feature guide rollout (2026-10-23)

- User requested a tutorial modal introducing features, including automatic display to existing users after an update. Implemented src/features/feature-tour with bundled English copy matching the current UI, SVG feature icons, 4–6 steps, Back/Next/Got it, Close/Skip, progress indicators, keyboard focus containment/Escape, body-scroll restoration, dark mode, short-screen scrolling and native banner/safe-area spacing.
- The guide opens after authenticated app data is ready for both restored and new logins, excluding TV profiles. A local per-guide-revision marker is written only when dismissed/skipped/completed. Existing installs have no marker and will therefore see this introduction after installing the new client. It does not recur on every build or launch. Settings > App guide closes Settings and reopens the tour. Increase FEATURE_TOUR_REVISION only for material guide changes; no backend/Remote Config dependency. Storage failures retain dismissal for the current App instance.
- Contents use AccessProfile/permissions: calendar, event details, academy/cycle-scoped search, recent notification history, settings/dark mode/help; Chief edit/save/audience choice and PDF preview/Confirm Import; read-only Commander academy switching; SGL conflict markers. Student copy describes only their assigned cycle and omits staff capabilities. No real codes or personal/schedule data used.
- Guide presentation waits for loading, an active optional app-update prompt, import modal or save-notification chooser. Notification onboarding waits for the guide. Sessions needing or replaying the guide skip App Open ads; an in-flight ad rechecks the guide before presenting. The guide itself does not wait for ad SDK/ATT success. Native banners retain their separate behavior with reserved modal padding; web reserves no ad space.
- Verification: 34 Jest suites / 185 tests passed; TypeScript and production build passed; whitespace check passed. Coverage includes existing saved iOS/Android Chief logins, old/missing revision marker, dismissal/remount/replay, delayed eligibility, role permissions, completion/back/Escape/focus, storage failure, Settings replay and an ad loading while the guide opens. Build warnings remain the known AdMob source-map, Browserslist and Node warnings.
- Local only. No push/deploy/native sync/build/store submission or actual-device visual verification. Existing save/auth/synchronization repairs and popup cooldown changes preserved. Installation of an authorized client release is required for existing phones to receive the guide; no user decision needed for the implementation.

## Local feature-tour preview (2026-10-24)

- User wanted to inspect the guide before release. Added a development-only App wrapper path accepting `?previewFeatureTour=student|chief|sgl|commander`. It displays an illustrative local calendar, the real guide, and role-selection/reopen controls without mounting `AppApplication` or connecting to Firebase. Access requires NODE_ENV development and a loopback hostname; the branch is compiled away in production.
- Ran `npm.cmd start` from this worktree. Server is active on port 3000. HTTP 200 was verified for the Chief preview route; CRA compiled all source with only existing AdMob source-map/Browserslist/Node warnings. `npx.cmd tsc --noEmit` passed after correcting preview role typing.
- Preview URL: `http://localhost:3000/?previewFeatureTour=student` (replace student with chief, sgl, commander). Browser device emulation allows narrow-screen inspection. Close the modal, choose a role, and reopen it. Stop the process with Ctrl+C in its terminal. Preview addition remains local/uncommitted; no real Firebase access or release action.

## Schedule save and native synchronization repair (2026-10-23)

- Report: Android Chief gets a save authorization error plus unavailable cross-academy checks; iOS shows change history while displaying the previous event, with the change visible later. The exact historical device session is not available; installed versions/install sources and iOS editing role were requested.
- Confirmed implementation defect: REST event saves/additions/deletions queued notifications after server acknowledgment but did not update local events. The initial HTTPS schedule load was never repeated, so stalled native realtime delivery could leave successful writes invisible indefinitely.
- Fixed event local updates after acknowledgment. Native production schedule/metadata reads now consistently use HTTPS: initial load, foreground, online, foreground notification and 30-second visible polling. Web keeps its realtime path and staging remains separate. Lifecycle cancellation, request timeout and write revision guards reject stale results; background polling skips hidden documents. Refresh failure keeps the last data with a visible warning/retry. Network-ambiguous writes trigger a fresh read without blindly resending.
- Database day/event keys are retained through normalization; sparse/object event collections update their actual key. Bulk replacements and metadata additions update their local state/keys without waiting for a realtime callback. No academy/student permissions or import confirmation flow changed.
- Native token refresh now recovers invalidated refresh credentials and expired ID tokens through the already authenticated/saved login, validates Chief academy claims, deduplicates simultaneous renewal, and retains only in-memory recovery context when Keep Login is off. Session-generation checks prevent late token/write use after logout. Explicitly rejected writes receive one forced-auth retry; network/timeout errors are not automatically retried. Persistently denied writes still fail; no rules relaxed.
- Event editor awaits save/delete completion, disables duplicate submissions and retains draft inputs on failure. Cancel remains available. Event edit controls now have accessible labels.
- Verification: full Jest 33 suites / 176 tests passed, covering both native platforms without realtime delivery, failure/no-notification, stale-read protection, scoped foreground refresh, sparse keys, editor draft retention, invalid refresh and expired token recovery, concurrent renewal, Keep Login off, rejected-write retry, session switch, staging isolation and ambiguous timeout. TypeScript and production build passed with only existing AdMob source-map, Browserslist and Node warnings. Whitespace checked after formatting cleanup.
- Live read-only checks: production RTDB rules match local BLC/KTA write scope; Chief and manager fresh and refreshed tokens have expected claims, both conflict/history endpoints return HTTP 200, and scoped SGL readers return HTTP 200. Added optional --refresh-auth to the sanitized reader diagnostic. No production schedule mutations, notifications sent, server deployment, GitHub push, native build or store release. Existing dirty native/docs files and earlier 30-minute popup cooldown edits preserved.
- Remaining: exact Android historical cause and Firebase billing relationship are not proven by current successful server checks. Physical Android/iOS verification and installation of a separately authorized new client build are required. No promise of zero defects or full device validation; do not present the local repair as already deployed.

## Android and iOS version update authorized for master (2026-10-17)

- Push completed and remote verified: master advanced 1c683a5 -> 032c466. Codemagic completion/Apple acceptance remain pending verification; no Android upload performed. This final status note remains local.
- User requested Android versionCode 14 and versionName 4.1.0 and explicitly approved pushing both native version changes to master. Android changed from 13 / 4.0.9; iOS Debug/Release already changed from 2.0.1 to 2.0.2 to address Apple's closed release train.
- Verified native version settings, existing app/bundle ID, Info.plist wiring and Codemagic build-number override; whitespace check passed. No runtime source changes or new native archive verification. Existing master CI builds/uploads iOS; no Android AAB upload or Remote Config announcement performed.

## iOS closed release train correction (2026-10-17)

- Codemagic build 81 from master 1c683a5 generated the signed IPA but failed App Store Connect publishing. User-supplied Apple errors 90062/90186 identify 2.0.1 as previously approved and closed to further build submissions. Incrementing the CI build number alone cannot resolve this.
- Updated both Debug/Release MARKETING_VERSION entries to 2.0.2. Confirmed Info.plist uses MARKETING_VERSION for CFBundleShortVersionString and CURRENT_PROJECT_VERSION for CFBundleVersion; Codemagic overrides only the latter with BUILD_NUMBER. Existing bundle ID and Android version retained.
- Verified the two settings, plist wiring, CI override and whitespace locally. No runtime code changed, so no redundant frontend suite/build. Native archive and Apple acceptance require the next authorized macOS CI run. No push/upload/Remote Config publication performed. Firebase SGL repair already deployed remains effective independently of this failed app upload.

## SGL reader production deployment completed (2026-10-17)

- Live access-boundary verification passed: both endpoints deny unauthenticated and counterpart-academy SGL requests for both academies (8 expected HTTP 403 responses).
- At explicit user request, deployed only getCrossAcademyConflictNotices and getNotificationHistory from pushed commit 1c683a5 to production blc-calendar-e302f, Node.js 22 / us-central1. Both update operations and CLI deployment completed successfully.
- Post-deployment live verification: real scoped BLC/KTA SGL credentials now receive HTTP 200 on both endpoints (previously 403); fresh signed Chief and NCOA Manager sessions also succeed for both academies. All 12 reads pass. The reported date correctly returns no conflict for different stored locations; current history responses are empty. No phone UI/device receipt claim is made.
- Used the existing deployment helper to prepare the current staging-device analysis parameter without printing its value, then removed the temporary dotenv file. No schedule mutation, notification send, database/rules deployment, unrelated function update or additional master push. Existing SDK-version upgrade warning remains; deployment itself succeeded. This is a server-only repair, applicable to the existing TestFlight app.

## Confirmed production scoped-SGL authentication mismatch (2026-10-17)

- Push completed: `1c683a5` on origin/master, fast-forward from `6ec443d`. No Firebase deployment performed. The live SGL fix remains pending deployment of the two reader functions. Automatic CI completion is unverified; this post-push status note remains local.
- Follow-up: user confirmed the BLC location change and requested pushing the prepared repair to master. Preparing scoped commit/push with existing CI enabled. No Firebase deployment requested in this follow-up; the live SGL fix still requires deploying both reader functions. The reported date discrepancy is resolved without a schedule mutation.
- User clarified normal native logins fail while staging test-role views work. Reproduced HTTP 403/PERMISSION_DENIED on both production conflict and history endpoints using the actual scoped SGL credentials accepted by the client, for both academies. Root cause: notificationReaderConfig had only the legacy bare BLC credential; backend incorrectly treated that legacy suffix as the academy-scoped SGL suffix. Earlier zero-date/production checks tested the wrong derived credentials.
- Prepared separate scopedSeniorCode configuration matching the released client without printing values. Both conflict and history now share isAuthorizedSglCode; bare legacy access remains BLC-only, scoped access requires the matching academy prefix, student cycle and signed administrator permissions remain unchanged. Removed acceptance of legacy-prefixed forms that are not staff logins in the client.
- Verification: all 20 backend tests pass. Added parity validation against both client login paths without exposing credentials, and full handler fixtures exercising both academies, SGL/Chief/manager, same-room overlapping times, different-room suppression, legacy BLC compatibility and other-academy rejection. No frontend runtime changes; did not repeat unchanged frontend build/suite.
- Fresh production manager/Chief sessions produced correct server-issued claims and HTTP 200 on both endpoints for both academies. Recent iPhone request logs contain successful signed queries and unsigned 403 queries; no request bodies/tokens were logged by diagnostics. A saved-session-specific administrator failure remains unproven.
- Reported production date currently has BLC 13:00-14:30 at MPR and KTA 14:00-15:00 at AUD. Its zero conflict response is consistent with stored locations. Staging is separate. Awaiting clarification whether normal-login phone display differs; no schedule writes performed.
- Local diagnostic scripts verify staff readers and inspect sanitized request statuses. Repair is uncommitted and NOT deployed. Requires explicit authorization for getCrossAcademyConflictNotices/getNotificationHistory deployment and any master push. After deploy rerun real scoped reader checks. No native app update is needed for this server repair; actual phone verification still pending.

## TestFlight conflict report investigation (2026-10-17)

- User reports missing shared-location markers on iPhone TestFlight build 80 / 6ec443d. Requested affected access role, academy, date and location without requesting credentials; awaiting details before attributing a cause.
- Read-only production checks with populated dates succeeded for both academy SGL scopes (HTTP 200, one notice each). BLC had 165 schedule dates and KTA 21; neither returned object-shaped event collections. No schedule details/credentials logged, data modified, code changed, push or deployment performed.
- Existing checks track overlapping AUD/AUDITORIUM and MPR only. Production Chief/SGL use the scoped callable, while test-mode profiles use staging schedules. This server check does not establish the phone's role/session, target date, or native rendering outcome. Do not claim fixed until the reported case is reproduced.

## App update guidance push and final recheck (2026-10-17)

- Push completed: commit `6ec443d` fast-forwarded origin/master from `64dc372`. No manual deployment or Remote Config publication was performed; automatic CI completion and store availability remain unverified. This post-push record is local.
- User explicitly authorized master push of the optional native update feature. Preparing a scoped commit and fast-forward push with existing CI enabled; preserve unrelated notification deployment documentation/script and native IDE changes.
- Added a regression proving a different newer release prompts even after the prior release was snoozed. All 32 frontend suites / 158 tests and TypeScript passed again. Production build had already passed for the unchanged runtime implementation.
- Next release activation still requires verified public store availability and per-platform Remote Config publication; no automatic store discovery, configuration publication or device validation is claimed. See APP_UPDATES.md. The first feature-containing native installation is required.

## Optional native store update guidance (2026-10-17)

- Implemented native launch/foreground Remote Config checks, an optional Update/Later modal, and a Settings update card that remains visible during snooze. iOS and Android compare their installed marketing version (Capacitor App) against separate `app_update_ios` / `app_update_android` JSON string parameters. Store destinations use the established App Store ID and Android bundle ID. Web/PWA/emulators do not check or prompt.
- Announcements require `enabled:true` and a valid newer numeric version. Missing/disabled/invalid versions do not prompt. Later/Escape/store navigation snoozes the same platform/version for 24 hours, with in-memory fallback if storage is unavailable. Network/config/plugin failures leave app access available. No forced-update gate in this initial implementation.
- Added `@capacitor/app@8.0.0`, with only that package added to the lockfile. `cap update` added it to Android and iOS generated dependency lists. Previously dirty native generated files were backed up to `release-assets/app-update-native-backup`; comparison confirms only the App plugin additions relative to those backups. Existing native IDE, notification documentation and deployment-script changes were preserved. Native asset/plugin registration copy still uses `cap sync` before a release, as documented.
- Verification: all 32 Jest suites / 157 tests pass, including native platform store destinations, persistent snooze with retained Settings entry, web exclusion, equal-version suppression, malformed policy and offline behavior. TypeScript, production web build and tracked diff whitespace check pass. Known AdMob source-map, Browserslist and Node warnings remain. No native compilation, physical-device/store-link verification, or live Remote Config fetch was performed.
- C: had zero free space, intermittently preventing process/log creation. Installed the package using an npm cache on E: under `release-assets/npm-cache-app-update`, and ran Jest with a project-local cache. No existing user files were deleted. npm install reported existing dependency-tree audit findings; only the single Capacitor App package was added, and no broad audit fix was attempted.
- Current new feature changes are local/uncommitted. No GitHub push, Remote Config publication, Firebase deployment or store release was performed for this new feature. Setup and per-release activation instructions: `docs/APP_UPDATES.md`. The first native release containing this feature is required before users can receive later prompts; set each platform's public release version only after store availability is verified.
- Prior marker work is already on master as `64dc372`, and its Cloudflare production bundle was verified. Earlier pending-push statements below are historical.

## Test-mode conflict visibility and calendar marker polish (2026-10-17)

- Investigated the report that BLC/KTA Chief and SGL profiles in the `318709` iPhone web test session show no shared-location markers. Found that test-mode role switching cleared counterpart schedules and disabled client conflict display for every profile except NCOA Manager. Chiefs (`SCHEDULE_IMPORTER`) and SGLs (`SENIOR`) now load the counterpart academy schedule from staging and show its computed conflict markers. Students and TV views remain excluded; production Chief/SGL reads remain on the scoped server callable.
- Added focused role-policy tests: Chief/SGL test-only access and the student/TV restriction are covered. Full frontend suite passes 30 suites / 149 tests, TypeScript passes, and the production build emits `main.a13d376b.js`; only the known AdMob source-map, stale Browserslist and Node deprecation warnings remain. Scoped `git diff --check` passed. TV integration test now mocks the scoped conflict callable to avoid a false console error.
- Refined the calendar marker into a small white circular badge with an orange outline and building icon. Location-only conflict dates use an orange-tinted cell and border; internal time-conflict dates remain red, including dates that have both kinds. Dark mode preserves the same distinction. Updated the legend to use the matching icon. Added a focused visual regression assertion.
- Follow-up visual polish: moved the building badge to the date cell's upper-left border, half outside the box, and reduced its phone size so it does not cover the date number or top color markers. The focused calendar conflict test, TypeScript, and production build passed; only existing AdMob/Browserslist warnings remain.
- The public Cloudflare site was previously checked serving `/static/js/main.fd13f7e3.js`; this corrected app must be pushed to `master` to trigger Cloudflare Pages production deployment. The user explicitly requested the `master` push. Confirm the production artifact and refresh the iPhone PWA after the push completes.
- No access codes, schedule data, or personal data were added to this handoff. Preserve unrelated dirty files.

## Production notification backend deployment (2026-10-17)

- User explicitly authorized master push (`c965280` successfully fast-forwarded origin/master), then notification backend deployment. These instructions supersede earlier branch-only/no-deploy notes.
- Confirmed `blc-calendar-e302f` had no Firestore database or rules release. Enabled Firestore API; created `(default)` Standard / Firestore Native database in `us-central1` with delete protection. Deployed closed Firestore rules and new `getNotificationHistory` + `pruneNotificationHistory`, verified reads/rules/scheduler, then updated existing `sendScheduleNotification`. No unrelated functions or RTDB rules deployed.
- All three functions ACTIVE on Node.js 22. Live BLC/KTA scoped SGL reads succeeded with zero records; missing credentials and direct unauthenticated Firestore reads return 403. Scheduler enabled for every day 03:00 Asia/Seoul. History starts on future explicit sends; retention is 30 days.
- Verification: all 11 notification backend tests passed before rollout; rules compiled; both deployment commands succeeded; final live checks passed. Verification helper initially expected only numeric cron; Cloud Scheduler retained the equivalent English schedule, which is now accepted and verified. First deploy stopped on a missing source-analysis parameter; copied the existing staging-device setting silently into a temporary dotenv file, completed deployment, and removed the file. No credential values logged.
- Limits: no actual test notification sent, no production schedule edited, no new-send/device end-to-end test, live retention execution or student/admin signed-session smoke. Separate cross-academy conflict callable remains pending. Previous full 146 frontend/19 backend tests apply to unchanged app source. Mobile build/upload status is not independently verified.
- `scripts/notification-deploy-ops.cjs` and deployment docs are local/uncommitted; no further GitHub push performed. Preserve unrelated native generated/IDE changes.

## Cross-academy conflict follow-up (2026-10-17)

- Root cause confirmed: Firestore notification backend rollout did not include the separate `getCrossAcademyConflictNotices` callable; production Functions list has no such endpoint although Chief client calls it. Therefore BLC/KTA Chief checks cannot complete. It must be deployed before those notices can appear.
- Commander client conflict comparison also requires `schedule.academy`, but RTDB day records omit that field. Calendar and Event View now attach the currently selected academy at render time, fixing symmetric BLC/KTA comparison. NCOA Manager now uses the scoped server summary callable along with Chiefs.
- Added scoped SGL access for BLC/KTA 0209 via the existing server-side read-only code configuration. The callable returns only the caller's event ID, location and counterpart academy; it does not grant schedule writes or return the other event's details. NCOA6120 now uses the same callable as the academy Chiefs.
- Deployed `getCrossAcademyConflictNotices` to `blc-calendar-e302f` (Node.js 22, us-central1). Live checks accepted BLC/KTA read-only SGL requests and rejected unauthenticated requests. Checks used an empty date list, so they verified authentication/handler response, not real overlapping live schedule output. No production schedules were read through a populated query or modified.
- TypeScript and production build passed (known AdMob source-map/Browserslist warnings); `git diff --check` passed. Automated tests were not run for this follow-up. Client code/doc changes are pending GitHub push. The temporary deployment parameter file was removed.

## GitHub push authorized (2026-10-17)

- User requested pushing the verified changes to GitHub. Prepared the current `fix/android-audit-20261013` branch for push, containing notification center/grouping/bulk clear, login recovery, auth cancellation, conflict/ad/UI updates and their tests/docs. Exclude native generated/IDE-only local changes.
- Keep master unchanged because its push trigger builds/uploads iOS automatically. No Firebase/Cloudflare deploy or store release is authorized by this push request. Backend rollout and physical-device verification remain outstanding; earlier local-only notes describe historical status.

## Full local verification follow-up (2026-10-17)

- User requested a comprehensive double-check of current changes. Reviewed login cleanup, notification history request/lifecycle/grouping/scoping, Settings toggle layout and App Open changes alongside automated checks.
- Found and fixed a history loading edge case: AbortController cancellation did not interrupt an awaited administrator token restoration. History auth now observes cancellation; late token completion cannot issue a cancelled HTTP request. Added stalled-auth/cancel/retry and pre-cancelled request regressions.
- Final verification: all 30 frontend suites / 146 tests passed via `npm.cmd run test:emulator`; local demo-project RTDB write/read/delete smoke passed; Functions exports loaded. All 19 backend tests passed (history handlers/storage/scope, cross-academy conflicts, staging push policy); backend index syntax, TypeScript, production build and diff whitespace checks passed. Sample DOM preview smoke passed bell, 8 alerts / 6 groups, expansion, Clear, Clear all, Undo and DailyView highlight.
- Build warnings remain: known AdMob missing source maps, stale Browserslist database and Node deprecation. Emulator warns of older firebase-functions and host Node 24 versus declared runtime 22; it used host Node 24. Scheduled pruning was not exercised (no Pub/Sub emulator); real Firestore persistence/rules, production push and physical iOS/Android runtime remain unverified. No native compilation performed. Passing local checks does not establish all-device or cloud behavior.
- Local-only changes; no dependency upgrade, push, deploy, cloud data changes or release. No user decision needed for this cancellation fix. Preserve all unrelated dirty changes.

## Logout / login loading repair (2026-10-17)

- Found re-login unconditionally awaiting notification cleanup plus production and staging Firebase JS Auth sign-out. Native REST-token sessions do not use those SDK auth sessions; an unused instance's persistence initialization could block that wait. Native logout now skips JS Auth sign-out (except emulator sessions); web only signs out SDK instances with a current user. Existing REST token/local session cleanup remains.
- Added a 20-second login wait limit with an actionable retry message; retain the underlying cleanup barrier across retries to prevent late sign-out racing a fresh session. A genuinely stuck active web SDK cleanup still requires recovery before login can succeed, but no longer leaves the button spinning forever. Login catches rejected callbacks, resets busy state in finally, retains entered input for retry, and blocks duplicate submission.
- Verification: 30 Jest suites / 144 tests passed; TypeScript and diff whitespace check passed. Added native iOS/Android and web logout/login regressions with never-resolving unused SDK sign-out, Login error/retry/duplicate coverage, and cleanup timeout barrier coverage. Production build result follows below.
- Production build passed with the known AdMob source-map and stale Browserslist warnings. An initial concurrent build observed a test callback typing issue; fixed the callback, reran its test and TypeScript, and completed a fresh successful build.
- Local source changes only in mobile-audit-20261013. Physical-device verification and native release remain outstanding. No push, deployment, native build or store submission; no user decision needed for this code fix.

## Notification center implementation (2026-10-16)

- Follow-up request (2026-10-17): added **Clear all** for all currently visible history, including collapsed groups. Bulk/single Clear both support six-second Undo snapshots. New arrivals remain unaffected by a prior Clear all.
- Group same-event changes only within academy, cycle, schedule date and a maximum five-minute window. The newest entry is the summary; “View all changes” expands individual originals. Selecting a summary marks its group read and opens its schedule; selecting a detail marks only that entry read. Deleted-event records without stable event identity are not grouped. No history records are combined or overwritten on the server.
- Added frontend regressions for bulk clear/undo with late arrivals, group boundaries, original-detail expansion, selective/group read status and persistence. Latest results: 29 frontend suites / 138 tests, TypeScript, production build and 11 history backend + 4 cross-academy tests passed. Build emits known AdMob source-map/Browserslist warnings.
- Refreshed the local sample preview at `http://127.0.0.1:4178`; its DOM smoke check passes 8 alerts in 6 rows, three-change expansion, Clear, Clear all, Undo and highlighted event navigation. It uses a network-blocked in-memory data adapter, not production data or live Firestore. Full behavior and security rollout requirements remain in `docs/NOTIFICATION_CENTER.md`.

- Follow-up local viewing request: prepared a separate sample-only preview under the original workspace's `release-assets/notification-center-preview`. `node preview.cjs` serves `http://127.0.0.1:4178` on this PC. Uses actual Calendar/NotificationCenter/DailyView with an in-memory API, excludes Firebase modules and blocks network connections through CSP. Includes role/academy controls, dark mode, simulated offline errors, sample addition/reset. HTTP 200 and DOM smoke checks for bell/list/Clear/Undo/event highlight passed. No product code or external state changed for this preview.

- User approved the first notification-center release; consecutive-change grouping is explicitly deferred. Added Calendar header bell/red unread dot, recent 30-day history grouped by day, event navigation/highlighting, deleted/unavailable-event explanation, explicit read/all-read, left-swipe Clear, keyboard/mouse alternative and six-second Undo. Includes dark-mode and safe-area/native-banner styling.
- Added server-owned Firestore history to the existing explicit notification send flow, with selected audiences, stable retry IDs, scoped/paginated callable reads and daily retention cleanup. Students are server-restricted to their active BLC cycle; Chief/Commander scopes and SGL credentials are validated server-side. Staff notes never enter student history. Read/Clear state remains local to this device/profile; no production history is queried in test mode.
- Worktree remains `release-assets/mobile-audit-20261013`; original dirty worktree and unrelated changes preserved. No push, deployment, cloud provisioning, live schedule write, live push, native sync/build or store release performed. Cloud Functions dependencies installed locally from the existing lockfile; runtime exports load successfully.
- See `docs/NOTIFICATION_CENTER.md` for behavior and release prerequisites. Firestore existence/rules/IAM/scheduler readiness still require review before an explicitly authorized deployment. The new Firestore rules deny all direct client access and must not overwrite unrelated cloud rules without review. Real Firestore and native-device verification are not claimed. No old push history is backfilled.
- Final verification: frontend tests passed (29 suites / 131 tests), TypeScript passed, backend history tests passed (11) plus existing cross-academy tests (4), runtime Functions exports loaded successfully, scoped diff whitespace check passed, production build passed with existing AdMob source-map/Browserslist warnings. Tests used mocked/in-memory services; no native device, Firestore emulator or live cloud verification performed.

## Settings notification toggle alignment (2026-10-16)

- Removed the mobile-only vertical layout from the Notifications settings card. The label and toggle now share a horizontal row on mobile as on desktop, with a constrained right-hand area for wrapping error/help text.
- Change is local in `release-assets/mobile-audit-20261013/src/components/GeneralSettings.tsx`. No push, deployment, native release, or device installation performed. No user decision needed; visual device verification remains outstanding.
- Verification: scoped diff whitespace check passed; full Jest passed (26 suites / 118 tests); production build passed with existing AdMob source-map and stale Browserslist warnings.

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

# NCOA Schedule Calendar — Project Handoff

## Native store update candidate (2026-10-04)

- Prepared the next native app update in an isolated worktree. The installed app label is
  now **NCOA Schedule Calendar** on iOS and Android; the existing application/bundle ID
  remains unchanged. Replaced the old app icon with the user-provided calendar art,
  generated iOS/Android icons, and changed web favicon/PWA icons. Store listing
  names/icons still need manual updates in App Store Connect and Google Play Console.
- Added native App Open ads for all access roles, on first entry and app foreground, with
  a one-hour cooldown. Web/TV does not load ads. Production uses the Android/iOS App Open
  unit IDs supplied by the user; staging/development continues using Google's demo units.
  This needs physical-device validation with each platform's production build.
- iOS marketing version remains 2.0 and Codemagic uses its automatic build number. The
  user reports the current build is now uploaded to App Store Connect; do not overwrite
  or submit another build without an explicit request. Android is prepared as `4.0.8`
  (`versionCode 11`), incrementing the existing Play version `4.0.7` (`versionCode 10`).
- After the user provided separate Android/iOS App Open unit IDs, production platform
  selection was connected while test/development keeps Google's demo units. Verification:
  TypeScript passed, 22 Jest suites / 87 tests passed, and production web build passed
  with known AdMob source-map and Browserslist warnings. Android debug compilation was
  attempted but could not complete because this isolated Windows path has non-ASCII
  characters and its Gradle distribution/Android SDK dependencies are unavailable.
  This follow-up is ready for GitHub push; it does not deploy Firebase or submit an app
  version for review.

## Test-session role and notification preview (2026-10-04)

- The 318709 staging session now has a Settings control to preview the commander, BLC/KTA chief, BLC/KTA SGL, active BLC student-cycle, and BLC/KTA TV views without entering another access code. The test administrator view restores full staging-only tools. Student previews are limited to currently active BLC cycles.
- Manual notification tests use role-specific sample payloads: commander BLC + KTA, Chief/SGL their academy, and student their active BLC cycle. Commander preview sends two sample pushes. The staging relay delivers only to the current approved device; this does not contact other users or simulate actual role subscriptions.
- Role switching changes the client view only; authentication remains the staging administrator, and all database reads/writes remain in the separate staging project. Production auth and notification routing were not changed.
- Verification: TypeScript passed; 22 Jest suites / 85 tests passed; production web build passed with existing AdMob source-map and Browserslist warnings. No Firebase deployment or store build was run.

## iOS App Store version decision (2026-10-03)

- The user selected marketing version `2.0` for the next iOS release. Both iOS Xcode build configurations now use `MARKETING_VERSION = 2.0`; the bundle ID remains `dev.pages.blccalendar`.
- Codemagic supplies `CURRENT_PROJECT_VERSION` from its `BUILD_NUMBER` environment value. Keep this build number separate from marketing version; the user's last upload log showed build 69, and Codemagic should assign the next build number automatically.
- The last upload failed with Apple's `Cannot determine the Apple ID from Bundle ID ...` error after a successful IPA build/sign. Updating the marketing version does not itself resolve that independent App Store Connect upload error. Recheck after the next authorized build/upload.
- No store build was run or submitted, and no push/deployment was performed for this version-only change.

Last updated: 2026-10-02

## Calendar conflict color follows Event View resolution (2026-10-03)

- Calendar View now reads the same per-academy/date dismissed-conflict records as Event View. Dismissing an overlap in Event View clears that date's red conflict color in Calendar View; changing an event so it no longer overlaps also returns the date to the normal blue schedule color.
- Conflict pair identity and dismissed-state storage helpers are shared by both views. Added regression coverage for dismissed conflicts and edited times with no remaining overlap.
- Verification: 21 Jest suites / 80 tests passed, TypeScript passed, and the production build passed with the existing AdMob source-map and Browserslist warnings. This change is local; it has not been pushed or deployed.

## Conflict details and KTA UTC display (2026-10-02)

- Event View now lists each affected counterpart directly inside its event card, including event name, displayed time, location, and academy for commander cross-academy AUD/MPR conflicts. Calendar conflict markers navigate to that day's Event View; no conflict details dialog is used from the calendar. BLC and KTA event highlighting share the same time-overlap rule.
- KTA `start-UTC` entries display that source-facing time in import preview and schedule view. Since the end time is unknown, calculations use a zero-length numeric range so later events are not falsely marked as conflicts; staff may edit the event to a known time range.
- Verified: 20 Jest suites / 69 tests passed, TypeScript passed, production build completed with known AdMob source-map and Browserslist warnings. Conflict details and UTC behavior were pushed as `3d8ec51`; Cloudflare Pages later marked it Active.
- Follow-up after the user reported the marker was difficult to activate: increased its phone touch target from 16px to 28px and clarified its accessible label/title. The focused marker-click test, TypeScript, and build passed. Pushed as `343cb8e`; Cloudflare Pages reports Production Active at `https://96908b31.blc-calendar.pages.dev`. The stable project URL remains `https://blc-calendar.pages.dev`.
- User clarified that conflict details belong in Event View, not a Calendar dialog. Updated each affected event card to list its counterpart and made the Calendar marker navigate to that date's Event View. Commander cross-academy AUD/MPR conflict counterparts are included there. Verified all 21 Jest suites / 71 tests, TypeScript, and production build; build retains known AdMob source-map and stale Browserslist warnings. This follow-up is local and has not been pushed or deployed.
- Removed the Calendar conflict exclamation button and its legend; conflict dates retain the red visual treatment, and selecting the date still opens Event View. Focused Calendar navigation test updated. This change is local and has not been pushed.
- BLC student profiles no longer see conflict highlighting on Calendar or conflict warnings/counterpart details in Event View. Chief, SGL, and commander conflict visibility remains. Added regression coverage; this change is local and has not been pushed.
- Notification onboarding can be dismissed with a top-right close button; dismissal is remembered locally, while Settings retains the notification switch. It now waits for an explicit user tap before requesting OS permission. An unapproved test-phone error explains that the staging relay must approve the fingerprint. The local relay parameter file is absent, so no device approval can be verified or changed from this worktree; do not store the fingerprint in project memory. Event View conflict details support dismissing a conflict pair without changing schedule data. KTA events with the same exact time and distinct classrooms are grouped in one outer colored container, retaining individual event cards inside; its time badge is top-left, the grouping label is top-right, and its border follows normal schedule state colors (yellow upcoming, green ongoing, gray complete), independent of dismiss state. Verified: 21 Jest suites / 76 tests, TypeScript, and production build; build has the known AdMob source-map and Browserslist warnings. No notification relay or production service deployment was performed. These latest changes are local and have not been pushed.
- Follow-up: dismissed conflict pairs are now stored locally by academy/date and by event identity, time, and location, so they stay dismissed after navigating away and reopening Event View. Editing either event's time/location makes the updated pair appear as a fresh conflict. Verified: 21 Jest suites / 77 tests, TypeScript, and production build; only the known AdMob source-map and Browserslist warnings remain. This fix is local and has not been pushed.
- Follow-up: simultaneous-event group colors now match the normal event lifecycle: yellow before start, green while ongoing, gray after completion. The time range is positioned at the group's top-left and the grouping label at top-right; dismissing conflicts does not affect schedule-state color. Verified: 21 Jest suites / 78 tests, TypeScript, and production build with known AdMob source-map and Browserslist warnings. This change is local and has not been pushed.

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
# Android floating controls alignment follow-up (2026-10-15)

- Adjusted the Settings and chatbot floating buttons in the active repair worktree so Android positioning includes both the native banner height and the system bottom safe-area inset, plus an 8px gap. The previous `max()` calculation could overlap/underestimate the reserved native area across devices.
- iOS retains banner height + 8px; web layout is unchanged.
- Source edits are local and uncommitted. `npm.cmd run build` passed with the existing AdMob source-map and stale Browserslist warnings. No tests, native build, push, or release was performed. The current pushed Android 4.0.9/versionCode 13 does not contain this follow-up; a future Android update is required for device confirmation.
- No decision needed for the code adjustment. Before any push or release, follow explicit authorization rule in AGENTS.md.
# Floating controls size adjustment (2026-10-15)

- Reduced Settings and chatbot circles from 56px to 48px for iOS and Android, with corresponding icon reductions. Positioning logic remains unchanged, including the Android banner plus system safe-area calculation.
- Source changes are local and uncommitted. Production web build passed with the existing AdMob source-map and stale Browserslist warnings; native build/device verification and push/release have not been performed for this size adjustment.
# Shared KTA conflict dismissals (2026-10-15)

- Replaced KTA's per-device conflict dismissal state with `dismissedConflictKeys` stored on each shared schedule day. KTA calendar and Event View now read the same Firebase schedule value, so a successful Chief dismissal appears across subscribed devices.
- Only a KTA-scoped `SCHEDULE_IMPORTER` profile with `schedule.write` is passed dismissal capability. KTA viewers (SGL) continue seeing conflict details and red warnings without a DISMISS button. BLC's prior local dismissal behavior and student visibility restrictions remain unchanged.
- Verification: TypeScript passed; all 26 Jest suites / 112 tests passed; production build passed with known AdMob source-map and stale Browserslist warnings; scoped diff check passed. No production schedule mutation, Firebase deployment, GitHub push, native build, or store release was performed. A client update is required to distribute this UI.

## Persistent popup ad cooldown (2026-10-23)

- User requested fewer popup ads, with a 30-minute interval. App Open now persists the last close timestamp in device localStorage and no longer resets it on backgrounding. Launch/resume attempts respect the same 30-minute minimum; no timed automatic popup was added. Storage failures retain a session-only fallback.
- Updated regression coverage for foreground resume, module restart, the exact 30-minute boundary and storage-write failure. Full Jest passed (32 suites / 158 tests), followed by the expanded ad suite (12 tests). Production build passed with known AdMob source-map, Browserslist and Node warnings; diff whitespace check passed.
- Active source: release-assets/mobile-audit-20261013. Changes are local only; no push, deployment, native build or store upload. Installed users need a separately authorized native update. Physical-device verification remains pending; unrelated local modifications preserved.

## Feature tour visual alignment (2026-10-24)

- Updated the feature-tour dialog to use the app's existing soft-modal appearance: navy header, soft gray surface, blue accents, white cards and familiar shadows. The local role-preview shell now uses app surface/card tokens so the preview reads more like the real app.
- Verification: all 34 Jest suites / 185 tests passed and `npm.cmd run build` succeeded. Build emitted only existing AdMob source-map and stale Browserslist warnings. No native build/device check, push, deployment or store release performed; existing unrelated local changes remain preserved.
