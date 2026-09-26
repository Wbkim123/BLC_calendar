# TV website release

The website permits academy-scoped TV profiles and the authenticated owner. Existing native login behavior remains available. TV credentials are configured in `src/features/auth/tvAccessCodes.ts`; do not copy credential values into documentation, UI, logs, or messages.

TV sessions use Event View with the existing TV layout and cycle/date selectors. AUTO cycle selection refreshes every 30 seconds and when the page becomes visible. After the current cycle's last event, the next registered cycle is selected. A manual cycle selection stays pinned until AUTO is selected again. Empty academies show an empty state and never seed database records.

BLC reads the existing root data paths. KTA reads only `academies/kta/` paths. Owner login retains server authentication and checks owner claims before granting website access. Cached importer, staff, and student web sessions are rejected.

This release is scoped from the previously published website. It excludes pending PDF import/search/chatbot changes, Firebase rules/functions, native assets, Android version changes, and store submissions. Owner features from the published website are retained. The working project's broader unreleased functionality remains separate.

Verification: automated website login/academy isolation/empty-state/read-only tests, TV selection tests, TypeScript, and production web build. Known AdMob dependency source-map warnings are unchanged. Real TV visual verification remains pending.

Use a CI-skip commit for this web-only release to avoid the existing automatic Codemagic store workflow. Deploy the reviewed build directly to the existing Cloudflare Pages `blc-calendar` production project.
