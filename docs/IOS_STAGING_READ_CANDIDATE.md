## Candidate dependency adjustment (2026-11-08)

This candidate omits the development-only @capacitor/assets generator and its sharp dependency because repeated GitHub libvips downloads failed with HTTP504. The workflow uses the existing tracked iOS icons/splashes and never invokes asset generation. npm ci still runs normal lifecycle scripts, including patch-package. Runtime dependencies and remaining locked versions are unchanged. Original root-worktree asset-generation tooling remains available; review this candidate-specific tooling removal before merging into master. This does not remove or regenerate any native assets.

# iOS Staging read candidate — 2026-11-05

## Prepared locally

`codemagic.yaml` now contains `ios-staging-read-candidate`. It has no automatic trigger and no publishing block. The existing `ios-testflight` workflow is unchanged; pushing master still triggers that existing upload workflow. No push, remote build, signing operation or upload has been executed for this candidate.

- Bundle ID remains `dev.pages.blccalendar`, marketing version remains `2.0.3`.
- Production read flag is explicitly false; staging-only read flag is true. Build output is `build`, matching Capacitor webDir. These settings do not disable ordinary production login or turn the entire app into a staging app.
- Reuses the existing `codemagic` Apple integration and App Store signing configuration. Runs npm ci, TypeScript, unit tests, web build, iOS sync and signed archive on macOS.
- `TEST_BUILD_NUMBER` must be supplied as a positive integer after checking the latest App Store Connect build numbers. Local Xcode number 43 is not evidence of the latest uploaded number. No number was reserved or changed locally.
- App Store-signed IPA is a build artifact, not directly installable through Safari. Actual iPhone testing needs a separately approved App Store Connect/TestFlight upload and tester access. Build success alone is not device validation.

## Review before any external action

1. Isolated branch codex/ios-staging-read-candidate-20261105 is prepared from 7c620a5 in TEMP/blc-ios-staging-read-20261105. Local validation/commit status is recorded in NEXT_SESSION. Do not push the dirty root checkout or copy the entire directory. Compare with the newer automation worktree before selecting a base; root HEAD remains older.
2. Include the authorized-read module, App integration, related tests and this workflow. Review the complete candidate diff, including the pre-existing local App changes; this is not a one-file release.
3. The native generated files reported dirty in the root had no substantive `git diff` on inspection (line-ending warnings only). Leave them untouched. Run iOS sync only in the eventual candidate build workspace. Do not claim native compilation from the existing Windows web build.
4. Run release checks in the isolated candidate as required by `docs/release-checklist.md` after the release candidate is approved. The broad historical backend deployment example in that checklist is not part of this test: no production Firebase, rules, Cloudflare or Android release is required here.
5. Inspect repository CI/Cloudflare branch preview settings before proposing a branch push: absence of a trigger in this workflow does not prevent other services from reacting to a push.
6. Obtain exact approval for the candidate branch push and the named manual Codemagic build. Supply an unused TEST_BUILD_NUMBER, select the reviewed commit, and run only `ios-staging-read-candidate`. Remote macOS build minutes may be consumed.
7. Review build logs/artifact, then prepare a separate TestFlight upload approval. Do not run `ios-testflight` as a shortcut. No App Store public release is requested. Same bundle ID means TestFlight installation can replace the existing app on the test phone.

## Read-only iPhone test after approved distribution

Record commit, app version/build, iOS version and pass/fail without codes or tokens.

1. Confirm ordinary login still loads the correct production academy; do not edit production data.
2. Sign out, enter the existing staging session and select each test role. Verify BLC/KTA separation and active BLC student cycle restrictions. This is staging-manager simulation, not proof of individual student identity.
3. Background/foreground the app; inspect refresh and remembered session after restart.
4. Sign out and change roles/academy; verify no stale data from the previous session.
5. Temporarily disconnect the phone network and restore it; verify the UI does not silently fall back to production data. Record actual errors/recovery rather than assuming success.
6. Leave Android explicitly unverified if no device is available. Writes and push delivery are separate tests requiring their own scope.

PC/iPhone Safari validation is already user-confirmed; do not repeat it. Shared-code identity limitations and school organization export remain separate unfinished tasks.

References: [Codemagic first release pipeline](https://docs.codemagic.io/yaml-quick-start/first-signed-build/) and [App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/). Publishing is a separate configuration stage from producing an IPA.
