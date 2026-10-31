# Production release announcement automation

## Current status (2026-10-31)

Implemented locally, tested, **not pushed or activated**. The earlier manual publication of Android 4.1.1 and iOS 2.0.3 is already complete and is separate from this automation.

**Google identity setup is now complete and read-back verified after explicit user authorization.** Service account: `update-announcement-monitor@blc-calendar-e302f.iam.gserviceaccount.com`. Provider: `projects/245720895881/locations/global/workloadIdentityPools/update-announcements/providers/github`. Remote Config Admin and the repository-restricted Workload Identity User binding are installed. STS/Android Publisher APIs enabled; IAM Credentials already enabled. No private key was created. Play Console access and GitHub workflow activation remain pending.

Follow-up: owner reports Play permission has now been added. Local `verify-play-access.cjs` failed at IAM Credentials token generation with HTTP 403 before reaching Play; no local impersonation role/key was added. Use the configured GitHub OIDC workflow for the live check. Do not repeat the Play invite based on this unrelated IAM response. Actual Play API access, GitHub variable/environment configuration, scoped push and check execution are still pending.

- Workflow: `.github/workflows/update-announcements.yml`, hourly at minute 23 plus manual dispatch. No npm dependencies or native app changes are required.
- Runner: `scripts/release-monitor/run.cjs`; pure decision rules: `policy.cjs`.
- Tests: `npm run test:update-monitor` (25 tests including scoped repair and IAM setup tests).
- Live public iOS queries returned 2.0.3 for the correct app ID/bundle in both US and KR.
- Android Git history maps versionCode 14 to 4.1.0 and 15 to 4.1.1. Eleven unambiguous historical mappings were found. Store release names are never used as version numbers.
- Initial read-only inspection found no dedicated identity or active pool; the authorized setup above has since created and verified them. Repository variables and Play access are still untouched.
- GitHub connector confirms repository `Wbkim123/BLC_calendar` is public and defaults to `master`. Repository ID is `1229431110`, owner ID `145992262`; use immutable IDs in the trust restriction.
- Countries default to US/KR, based on the current operating context; the user was offered a country choice but has not yet replied. This checks configured storefronts, not every country worldwide.

## Decision rules

Android uses BOTH the production release lifecycle endpoint (must be published) and a production-track snapshot (must be completed, without userFraction or country targeting). Required countries must be explicitly available. Testing tracks, review/managed-publication pending states, staged and halted releases do not qualify. Different retained versions for different devices suppress global advancement. Unknown/ambiguous versionCode mappings fail visibly. Versions come from the committed Gradle history, so native releases must be built with those committed version settings; an independently overridden or uncommitted build is not supported automatically.

The Play track/country APIs require a temporary edit. The monitor creates one, reads it, and deletes only that edit in `finally`; it never updates, uploads or commits a Play release. A cleanup failure prevents Remote Config publication. A dedicated identity must not be shared with another Play publishing process. Dry-run has no published-setting changes, but still creates/deletes this temporary edit: do not describe it as entirely read-only.

iOS queries Apple's public lookup API for the fixed app ID and validates its bundle ID. All configured storefronts must return the same numeric version. Missing app, malformed response, timeout or disagreement prevents advancement. TestFlight and review builds are not public lookup results. Apple's phased automatic rollout still permits manual App Store downloads, so a publicly available version can qualify during that phase; this is deliberately different from Google Play's staged rollout.

Both platform queries must succeed before Remote Config synchronization. `--check` is the default and uses only server-side validation, not publication. Publish mode advances only newer versions, respects `enabled:false`, rejects conditional overrides, preserves unrelated template values, uses the original ETag, backs up locally and reads back. No blind write retries or downgrades. Newly advanced releases receive generic update notes instead of stale release-specific notes.

Only sanitized platform/version decisions or bounded error codes are logged. No credentials/raw API errors/full Remote Config templates are printed. The runner-local backup is ephemeral on GitHub; do not rely on it as durable cloud recovery. Firebase Remote Config's version history remains the operational rollback source. A readback failure after PUT may mean publication succeeded: inspect before rerunning.

## One-time activation sequence

Steps 1–2 have been explicitly authorized, executed and read-back verified. Steps 3 onward remain pending. The owner has already confirmed both existing store releases; do not ask for that confirmation again.

1. Create service account `update-announcement-monitor` in `blc-calendar-e302f`, controlled through the non-school administrator. Assign Firebase Remote Config Admin (`roles/cloudconfig.admin`) on that project, not project Owner/Editor. Enable required IAM Credentials, STS and Android Publisher APIs if absent. Do not create/download a long-lived JSON private key.
2. Create a Workload Identity pool/provider for GitHub OIDC (`https://token.actions.githubusercontent.com`). Map `google.subject=assertion.sub` and `attribute.repository_id=assertion.repository_id`. Restrict its attribute condition to ALL of: repository ID `1229431110`, repository owner ID `145992262`, `ref == refs/heads/master`, and `workflow_ref == Wbkim123/BLC_calendar/.github/workflows/update-announcements.yml@refs/heads/master`. Grant `roles/iam.workloadIdentityUser` to that pool's repository-ID principalSet on ONLY the dedicated service account. This supports short-lived tokens without a personal Google login dependency.
3. In Play Console, grant the dedicated identity access only to application `dev.pages.blccalendar`, starting with View app information. Validate the temporary edit/track read using this identity; if Google rejects it, inspect the precise required permission rather than automatically granting release/publishing administration. This account-specific API permission check has not been performed. The new release-summary endpoint must be available to this identity too.
4. With separate push authorization, commit/push only the monitor/helper files, workflow, docs and relevant package-script change. Preserve unrelated dirty changes. A master push also invokes the existing iOS Codemagic workflow; do not claim it is a no-build push. The new monitor stays off until explicitly enabled.
5. Create GitHub environment `update-announcements`, restrict deployments to master, and configure repository Actions variables:

   | Variable | Value |
   | --- | --- |
   | `UPDATE_MONITOR_WIF_PROVIDER` | `projects/245720895881/locations/global/workloadIdentityPools/update-announcements/providers/github` |
   | `UPDATE_MONITOR_SERVICE_ACCOUNT` | `update-announcement-monitor@blc-calendar-e302f.iam.gserviceaccount.com` |
   | `UPDATE_MONITOR_COUNTRIES` | `US,KR` initially; adjust to intended audience |
   | `UPDATE_MONITOR_ENABLED` | `true` only when connection is ready |
   | `UPDATE_MONITOR_PUBLISH_ENABLED` | `false` for initial live validation |

   Keep `UPDATE_MONITOR_ENABLED` at repository scope because job eligibility is evaluated before environment variables become available. No stored Google token, Apple API key or personal CLI refresh token is needed. Mandatory environment reviewers would also block every scheduled run, so choose that setting intentionally.
6. Manually dispatch mode `check`. Verify Google authentication, temporary Play edit cleanup, published/completed status, country availability and candidate mapping, then Remote Config read/validation. Current 4.1.1 / 2.0.3 should report `current` with zero changes. Confirm the workflow's error notifications are enabled for its maintainer. This live end-to-end dry-run is still outstanding.
7. After explicit authorization for ongoing automatic publication, set `UPDATE_MONITOR_PUBLISH_ENABLED=true`. Schedule invocations then publish eligible changes. Manual mode `check` always remains non-publishing. `UPDATE_MONITOR_ENABLED=false` stops all monitor jobs; publish false keeps checks running. Platform `enabled:false` is also respected.
8. Verify the next scheduled run and retain an old feature-containing device for the next real release when available. No downgrade/uninstall is needed just for testing.

## Runtime limitations and maintenance

- GitHub schedule timing is best-effort; the app also has a one-hour fetch cache and per-version 24-hour snooze. Do not promise immediate notification or an exact maximum delay.
- This is a public repository: GitHub can disable schedules after 60 days without repository activity. Check Actions status before the next release following a long idle period and re-enable if necessary. Do not add artificial keepalive commits. If continuous operation independent of repository activity becomes required, deploy the same decision logic under a separately authorized cloud scheduler instead.
- The store checks do not establish compatibility for every device/OS or every country. Releases raising minimum OS/device requirements need a client eligibility review before global announcements.
- If the source version mapping is missing, push the actual release source after authorization; do not guess from Play's release name. Ambiguous reused build numbers require review.
- API or transport failures fail the workflow and leave existing announcements in place; standard Actions notifications need a maintainer to monitor them. No separate alert recipient was configured or messaged.

## Verification commands

```powershell
npm.cmd run test:update-monitor
node scripts/release-monitor/run.cjs --ios-only --stores-only
node scripts/release-monitor/inspect-setup.cjs
```

The iOS-only public probe requires network but no credentials. Setup inspection uses the local Firebase CLI login only for reads. Full checks/publish require a short-lived `GOOGLE_OAUTH_ACCESS_TOKEN` with cloud-platform and androidpublisher scopes; Actions obtains this in memory. Never paste tokens into chat or command arguments.

References: [Play release lifecycle](https://developers.google.com/android-publisher/api-ref/rest/v3/applications.tracks.releases), [Play track statuses](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks), [Apple phased releases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases), [Google GitHub authentication](https://github.com/google-github-actions/auth), [Remote Config role](https://docs.cloud.google.com/iam/docs/roles-permissions/cloudconfig), [GitHub schedule inactivity](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).
