# Native staging setup

Prepared and deployed on 2026-09-28. Test project Functions and Rules and the isolated production push relay are active. No app update, device approval, data import, website deployment, GitHub push, or store release has occurred.

## Scope

- Firebase project: `ncoa-calendar-staging`.
- Realtime Database: `https://ncoa-calendar-staging-default-rtdb.firebaseio.com`.
- User reports Authentication initialized and Blaze billing connected.
- Native test sessions use staging authentication, token refresh, callable functions, and authenticated REST database reads/writes. Reads refresh every five seconds and after writes. Authentication tokens have a separate storage namespace. Staging failures do not fall back to production data.
- Production Firebase SDK settings and native messaging configuration remain in place. Website test login stays blocked. BLC/KTA paths and import confirmation are preserved.
- Staging rules allow only authenticated staging managers on the six schedule/location/uniform paths. There is no public read access and no root replacement permission.
- Production push delivery is shared by the same installed app. The new production relay validates a staging-project ID token and permits exactly one explicitly configured SHA-256 device-token fingerprint. It never accepts topics, conditions, or caller-supplied notification payloads.
- Switching between production and staging rotates the native messaging token to discard production audience subscriptions. Test-only logout retains the underlying token so repeated test logins normally retain device approval. OS token rotation or a production/test switch requires approving the new fingerprint.
- When notifications are enabled after test login, the staging registration endpoint requests a welcome notification. Schedule-change notifications use the same approved-device relay. Receiving/tapping a notification from the wrong environment does not navigate into its schedule. OS delivery itself must be checked on devices.

## Completed deployment

The user authorized staging setup/deployment and the single production push relay on 2026-09-28. The staging test secret was provisioned from the existing code without printing or writing its value to a tracked file. Staging Rules and the five staging Functions are deployed and ACTIVE. The production project retains its existing five functions and has exactly one new `relayStagingNotification` function. No other production function or production Database Rules were deployed. Staging Artifact Registry cleanup is set to retain images for 30 days.

The first token-generation smoke test uncovered missing `iam.serviceAccounts.signBlob`; the documented Service Account Token Creator role was granted only to the staging Functions compute service account on that same account. Staging login, Firebase ID-token exchange, authenticated Database read, and rejection of an unapproved push token then passed remotely. The smoke test did not modify data or send a notification.

No test schedule data is present yet. Push remains fail-closed until the owner enables notifications on the updated phone app and authorizes its device fingerprint.

## Deployment sequence for reference

Do not deploy all production functions or production rules as part of this setup. The exact commands used were scoped to the named staging config/project and isolated production relay config/project.

1. The staging Secret Manager secret `STAGING_ACCESS_CODE` is provisioned. Its value must not be printed or documented. Staging never uses production administrator secrets.
2. Staging Rules and Functions are deployed:

   ```powershell
   firebase.cmd deploy --project ncoa-calendar-staging --config firebase.staging.json --only functions,database
   ```

   The predeploy hook rejects other projects. Runtime staging handlers also reject a non-staging project. Ensure Firebase CLI supplies `GCLOUD_PROJECT` during function discovery; verify the discovered endpoints are the staging exports before confirming deployment.
3. The new initially deny-all production relay was deployed from `firebase.relay.json`, whose source contains only that function and its message policy. The original production config required an unrelated missing secret during CLI analysis, so the scoped config avoided inspecting or changing unrelated functions:

   ```powershell
   firebase.cmd deploy --project blc-calendar-e302f --config firebase.json --only functions:relayStagingNotification
   ```

   `STAGING_PUSH_TOKEN_SHA256` defaults to `disabled`, which rejects every device. The relay checks Firebase ID-token signatures/issuer/audience using a named staging Admin app. No staging service account gets broad production messaging or database access.
4. Prepare and install an updated native app through the existing signing/device workflow. Keep package/bundle ID `dev.pages.blccalendar`. Do not replace native production Firebase configuration files with staging files. Do not publish a store update or TV website as part of this step without an explicit request.
5. Log in to the test environment on the phone and enable notifications. Until approved, the UI shows `Approve test device: <fingerprint>`. Obtain this fingerprint from the user's own phone; it is a SHA-256 fingerprint, not the raw FCM token. Set `STAGING_PUSH_TOKEN_SHA256` in `release-assets/staging-relay-deploy/functions/.env.blc-calendar-e302f` (gitignored, default `disabled`). Redeploy ONLY the relay after authorization. Never accept an arbitrary third-party device for approval.
6. Retry enabling notifications; verify the welcome push on that phone. Test notification delivery in foreground, background, and locked state, then tap a schedule-change notification. Notification permission, APNs setup on iOS, and actual device behavior still matter.
7. The initial one-time baseline is already copied. Future PDFs use the app's existing Parsing Preview / Confirm Import and write only to staging. The KTA baseline is currently empty. Do not synchronize later changes between projects or copy users, credentials, device tokens, or unrelated nodes.

## Verification before release

- Run `npm.cmd test -- --watchAll=false --runInBand`, `npx.cmd tsc --noEmit`, and `npm.cmd run build`.
- Run `node --test firebase-functions/stagingPushPolicy.test.cjs`.
- Run the staging rules check only in the local demo emulator:

  ```powershell
  firebase.cmd emulators:exec --config firebase.emulators.json --project demo-blc-calendar --only auth,database "node scripts/staging-rules-check.cjs"
  ```

- Run the existing `npm.cmd run test:emulator` to ensure production/emulator function discovery remains intact.
- Confirm logged-out, normal-admin, and student credentials cannot read/write staging paths. Confirm staging manager cannot write root/unrelated paths. Confirm BLC and KTA writes stay in their own path.
- On device, edit schedules, locations, uniforms and import a PDF into staging; verify production and TV are unchanged. Verify a denied staging request cannot redirect to production.
- Confirm normal login returns to production, test data/errors/pending notification state are cleared, and normal-user push registration still works.

## Remaining manual work

Native compilation/installation, device approval and actual push receipt remain pending. The staging baseline is in place (BLC 165 schedule days, 9 locations, 3 uniforms; KTA was empty in production). Local automated checks cannot establish that the remotely reported billing/auth configuration or physical-device messaging works.

## Local verification result (2026-09-28)

15 Jest suites / 53 tests passed; TypeScript and production build passed (known AdMob source-map warnings only). Four relay policy tests passed. Staging rules passed in the isolated Auth/Database emulator. Remote staging login, ID-token exchange and authenticated Database read passed. The production relay correctly rejected an unapproved device fingerprint. The existing full emulator integration passed (52 tests before the final notification-error UI test, plus DB smoke test). The staging project predeploy guard accepted staging and rejected production. Native compilation and real-device delivery remain unverified.
