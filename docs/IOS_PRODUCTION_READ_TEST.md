# iOS production schedule-read test candidate
Prepared 2026-11-09; not pushed/built/uploaded.

- Branch codex/ios-staging-read-candidate-20261105, base8fd8c65. New workflow ios-production-read-upload: NCOA iOS production read test (manual, no store submission).
- Proposed2.0.4/build90 follows last confirmed89; confirm no intervening/concurrent upload before execution. Bundle dev.pages.blccalendar unchanged.
- Production read flag=true, staging flag=true. Ordinary login uses deployed production getAuthorizedSchedules; staging login remains staging. No credential/rules/web/public-store changes.
- Manual only. Existing workflows unchanged. Existing Apple integration uploads binary; submit_to_testflight=false and submit_to_app_store=false. Existing internal auto-distribution may notify testers. Same bundleID replaces app on test phone.
- Uses verified asset-generator-free lock and normal npm ci; no app source/backend changes.

## Read-only device verification after explicit push/build/upload approval
1. Install exact2.0.4(90). Use ordinary login, not Test as, to exercise production credentials. Do not import/edit/delete schedules or send notifications.
2. Check BLC/KTA SGL and applicable chief/manager/TV profiles: intended academy scope, schedule/detail loading. Manager may select both; scoped sessions must not retain manager data after logout.
3. Check active student cycle and invalid-credential rejection. Never share credentials in chat or screenshots. UI alone is not proof of response filtering;16 live server checks already passed separately.
4. Remembered login, foreground/restart, logout/academy changes and offline recovery. Build89 staging results do not prove this new production route.
5. Android/web/TV compatibility and adoption remain separate gates before direct database read closure.

## Recovery
If new test client fails, stop candidate distribution and diagnose. Existing public reads/old clients remain unchanged. Returning test device to89 restores its legacy production read path; this is interim compatibility fallback, not secure-rules rollback. Future uploads need unused build numbers.
