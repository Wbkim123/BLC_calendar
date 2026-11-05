# Schedule read authorization preparation — 2026-11-04

Status updated 2026-11-05 KST: user-authorized deployment of ONLY staging getAuthorizedSchedules succeeded using the personal Gmail CLI identity. Read-only remote verification passed 52 checks, including 1 active student cycle and unchanged six-path baseline. No GitHub push, production deployment, rules cutover, store submission or schedule-data mutation. Existing production rules remain selected by `firebase.json`; the new client path defaults OFF.

User subsequently confirmed PC and real iPhone Safari staging checks normal. Installed native app verification is still pending. See `NATIVE_READ_SECURITY_NEXT.md` for the next local preparation and `../CONTINUE_HERE.md` for cross-CLI continuation.

## Implemented behavior

- Staging-only build switch added 2026-11-05: `REACT_APP_STAGING_SECURE_SCHEDULE_READS=true` routes authenticated test-mode schedule reads through the staging callable while `REACT_APP_SECURE_SCHEDULE_READS=false` keeps normal production login/reads unchanged. Both default OFF. The original production flag still enables both environments for backward compatibility (including when the staging flag is false). Neither flag grants a staging session or changes authorization. Existing privileged staging setup/comparison reads remain unchanged.

- `getAuthorizedSchedules` in production resolves the submitted credential on the server. Client-supplied role, scope, cycle and profile do not grant access. Chiefs/SGL/TV are academy-scoped, commander can select either academy, students are BLC-only and limited to the active cycle derived from their credential using Korea dates.
- Student queries use `orderByChild('cycleName').equalTo(...)`. Student and TV responses whitelist schedule/event fields, omitting staff notes and conflict-dismissal metadata. Staff responses retain editing fields and original database keys.
- With `REACT_APP_SECURE_SCHEDULE_READS=true`, the app does not preload public schedules before login. Login and remembered sessions read through the callable; polling, foreground refresh and confirmed writes refresh through the same route. Read failures clear loaded schedules. Disposed session responses cannot repopulate a signed-out view. No fallback to public database reads.
- Staging exports a separate same-name handler. Only the existing authenticated staging manager UID with staging/admin/NCOA claims may simulate roles. No production credentials or secrets are accepted by this handler. The test-role interface uses this endpoint when the flag is enabled; privileged staging setup/other-academy comparison reads still use existing authenticated staging RTDB access.
- `database.rules.secure-reads.json` is a separate final-cutover candidate. It denies all direct client reads, preserves existing write scopes, and adds cycle indexes. Callable Admin SDK reads bypass these rules deliberately and enforce the response policy themselves. Do not replace staging rules with this production candidate.

## Limits and remaining decisions

This preserves the existing shared-code login model. It is not individual identity verification: knowledge of another valid shared credential permits that credential's scope. Student credentials remain predictable, and legacy client code contains credential comparisons. Do not claim personal student assignment is cryptographically enforced, or that known shared codes are confidential. Before a production confidentiality claim, agree on server-issued/non-public enrollment or individual identities, credential lifecycle and removal of legacy client credentials. No rotation was authorized or performed.

The public production database remains public until the candidate rules are explicitly deployed. Enabling the flag alone does not secure that database. Existing native versions and cached web/TV builds will fail if public reads are closed before a compatible rollout. A public endpoint also needs abuse/load review; maxInstances is a capacity setting, not a per-user rate limit. App Check has not been configured.

Local tests exercise policy, real RTDB/Auth emulator enforcement, and mocked UI/network integration. Subsequent read-only remote tests verified staging callable transport, authentication rejection and response policy. They do not prove production deployment, installed-native-app behavior, or new cloud recovery. PC and iPhone Safari behavior was subsequently user-confirmed. Staging simulation is an administrator test facility, not proof that a production student has a unique identity.

## Verification

- `npm.cmd test -- --watchAll=false --runInBand`: 35 suites / 195 tests passed, including enabled-path login, remembered roles, failed refresh and late-response/logout cases.
- `npm.cmd run test:functions`: existing 20 tests passed.
- `npm.cmd run test:read-security`: five new server policy/handler tests passed.
- `npx.cmd tsc --noEmit`: passed.
- `node scripts/test-read-security-emulators.cjs`: passed against loopback-only `demo-read-security`, including direct reads denied for anonymous/student/chief/commander/staging tokens, correct academy writes, and callable cycle/academy/field filtering. The runner installs candidate rules on the exact test namespace before assertions; Firebase's default namespace must not be assumed.
- Production builds with the feature OFF and ON succeeded; known AdMob source-map warnings remain. Restore the normal OFF build after preview checks. No native compilation or installed-app tests yet; subsequent PC and iPhone Safari checks were user-confirmed normal.

## Staging deployment and browser validation completed; native preparation next

Completed with explicit authorization: ONLY `functions:getAuthorizedSchedules` deployed to `ncoa-calendar-staging`. Existing staging rules, data, login, notification relay and production were not changed. Executed command:

```powershell
firebase.cmd deploy --only functions:getAuthorizedSchedules --project ncoa-calendar-staging
```

Completed browser procedure (do not repeat without a new reason): build a local preview with the flag enabled, sign in through the existing staging login and test commander, each academy's chief/SGL/TV, and an active BLC student cycle. Inspect the response to verify student staff-note exclusion and role/cycle switching; do not infer restriction solely from hidden UI. Use only staging data. Keep this preview separate from a release build: the production counterpart is not deployed yet, so ordinary production login in this preview fails closed.

After remote/device validation and the identity decision above, prepare an explicitly approved production endpoint/client rollout. Keep public reads until compatible clients are confirmed, then schedule separately approved rules cutover with a fresh backup and a reviewed rollback plan. Reopening public rules is not a security-neutral rollback. Preserve school access until the wider independence gates are complete.

Remote verification: `node scripts/verify-read-security-remote.cjs` passed 52 checks. Sanitized details are in ignored `.firebase/read-security-remote-verification.json`. Only the existing staging administrator was authenticated; no test users or datasets were created.
