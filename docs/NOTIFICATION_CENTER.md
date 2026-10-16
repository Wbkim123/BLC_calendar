# Notification center — local implementation, October 16, 2026

## User behavior

- A bell at the right of the Calendar class/cycle header opens the current academy's notification history. A red dot means at least one unread, uncleared notification in the last 30 days.
- Opening the panel does not mark notifications read. Selecting a notification marks it read and opens the available schedule with the existing change highlight. Deleted/replaced events and unavailable schedules display an explanation in the panel.
- Notifications are newest first and grouped by local calendar date. Changes to the same event, school, cycle and schedule date within a five-minute window appear as one row with the newest summary and a count. Expanding the row shows every original change in order; opening one change marks that entry read, while opening the summary marks the group read. Distinct event IDs, schedule dates, cycles and academies never merge. Legacy event deletions that lack an event ID stay separate.
- Left swipe reveals Clear; the options button provides the same action for mouse/keyboard users. **Clear all** removes all currently loaded entries, including every item in collapsed groups. Single and bulk clear can be undone for six seconds; alerts arriving afterward stay visible. Mark all as read applies to every fetched entry without marking later arrivals read.
- Read/Clear state is device-local and scoped by environment, academy, access level and student cycle. There are no individual user accounts in the existing code-based login system, so this does not synchronize personal state across phones. Changing a role, academy or cycle cannot reuse the prior scope's state.
- Polls while visible every 30 seconds, and refreshes on open, focus, reconnect and foreground notification. Push permission is not required for history. Failed requests show an explicit unavailable/retry state, rather than an empty inbox. Test/emulator sessions do not query production history.

## Recording and permissions

- `sendScheduleNotification` writes history before requesting FCM delivery, using the existing recipient selection. Chief and Commander history is always included; SGL and student history is included only when selected. Closing the send chooser without sending does not create history. PDF parsing/import confirmation behavior is unchanged and imports do not automatically generate notification records.
- A client-generated notification ID remains stable across retries. Firestore transactions create each audience record only once and preserve its original content/time. Older clients without an ID are supported but cannot deduplicate retry history. Failed FCM delivery does not erase the history record; failed history storage prevents a push with no corresponding history.
- The saved event name comes from the edit/add/delete action. Historical previews describe that notification; tapping opens the current version of the event.
- The new callable derives audience on the server. Signed Chief tokens are restricted to their academy; signed NCOA Manager tokens may query the currently selected academy. Read-only staff credentials are validated independently; student credentials derive an active BLC cycle from server schedule dates (Asia/Seoul). Request-supplied audience/role/cycle fields are not trusted. Staff-only notes are excluded from student history and student sends.
- The existing read-only login configuration is mirrored in `firebase-functions/notificationReaderConfig.json`; its parity test must pass if login configuration changes. Never log or document its values. Non-remembered login credentials remain in memory only; existing remembered login storage is reused.
- Store: server-owned Firestore `notificationHistory/{academy-audience}/items/{id}`. Do not store this under the existing publicly readable RTDB root. The supplied Firestore rules deny direct client reads/writes; only Functions access history. Existing schedule database rules are untouched.
- Reads are scoped, paginated and restricted to the last 30 days. `pruneNotificationHistory` removes older records daily. Default single-field Firestore indexes cover these queries.
- Grouping affects only the presentation; it retains each original server history record and its read/clear status. It does not invent a before/after value that the server did not record.
- No historical push backfill is possible from this implementation. History starts with sends handled by the new backend.

## Release prerequisites — not executed

This task only authorizes local implementation. Do not push, deploy Functions/rules, provision cloud resources, sync/release native apps or send test pushes without the user's explicit instruction for that action.

1. Inspect whether the production project's default Firestore database exists and whether it serves other applications. The supplied `firestore.rules` denies all direct access and must not overwrite unrelated rules without review. Provision a database if needed, and ensure the Functions service account can use it. None of these cloud states were checked or changed during implementation.
2. Review/deploy the Firestore rules and these specific Functions together: `getNotificationHistory`, `pruneNotificationHistory`, and the updated `sendScheduleNotification`. Review Firestore query operation and scheduler/IAM readiness. Do not deploy the separately pending conflict-notice feature accidentally.
3. Verify server storage/query and retention against a non-production environment before rollout. Current automated backend tests use in-memory adapters and injected handlers, not the real Firestore emulator/service.
4. Release the updated client only after server readiness is verified. Installed apps require a new native build. Validate bell layout, vertical scrolling, horizontal swipe, Undo, keyboard dismissal, safe areas/banner spacing, and dark mode on Android/iPhone. Test offline/reconnect and role/cycle changes with approved test data.

## Local verification

### Interactive sample preview

Run `node preview.cjs` from `E:/NCOA/BLC/blc_calendar/release-assets/notification-center-preview`, then open `http://127.0.0.1:4178`. This separate harness compiles the actual Calendar, NotificationCenter and DailyView against an in-memory history adapter; it does not change the production application. It uses the latest existing production-build CSS. Production Firebase modules are excluded and CSP blocks all connections. It offers sample alerts, academy/student selection, dark mode, simulated offline errors, new alerts and reset. PC users can reveal Clear through the options button, or use browser touch emulation for swipe. This loopback URL is for this PC only.

`node smoke.cjs` passed against the running preview: Calendar/badge, eight sample alerts across six displayed rows, expansion of three grouped changes, individual Clear, Clear all, Undo, and navigation to a highlighted DailyView event. This is a DOM integration smoke check, not native-device or visual screenshot verification. Restart the command if the preview process stops.

Final local results: 29 frontend suites / 138 tests passed; TypeScript and production build passed (known AdMob source-map/Browserslist warnings). The 11 history backend tests and 4 existing conflict tests passed; Functions runtime exports loaded successfully. No cloud data, real notifications or devices were used.

- `npm.cmd test -- --watchAll=false --runInBand`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `node --test firebase-functions/notificationHistory.test.cjs firebase-functions/notificationHistory.handlers.test.cjs`

Backend tests cover scope validation, active student cycles, audience routing, staff-note exclusion, retry idempotency, pagination at equal timestamps, expiration, save-before-send and failure handling. Frontend tests cover read/unread, individual/group Clear and Undo, bulk clear and late arrivals, grouping identity/window/date boundaries, opening an individual change vs. a whole group, gesture direction, pagination, academy/cycle isolation, stale responses, test-environment exclusion and safe error reporting. Native device and live cloud verification remain pending.
