# NCOA Schedule Calendar — Agent Instructions

Read `docs/PROJECT_HANDOFF.md` before making changes. It is the durable project memory for work completed across chat sessions.

Read `docs/NEXT_SESSION.md` when present before interpreting older handoff entries. It records the latest user-confirmed completion status, the separate worktrees, and pending work. Check the actual worktree path and Git status before editing; do not assume the original folder has been synchronized with GitHub.

## Non-negotiable rules

- Never push to GitHub, deploy Firebase/Cloudflare, submit a store build, or send external changes unless the user explicitly requests that exact action.
- A request to edit or prepare code is not permission to push or deploy it.
- Preserve unrelated local modifications. This worktree is intentionally dirty and contains substantial uncommitted user work.
- Keep the existing application/bundle ID `dev.pages.blccalendar`; changing it would create a different store app.
- Do not expose access-code values in UI text, logs, documentation, chatbot messages, or responses. Use `AccessProfile`, `accessLevel`, and permissions for authorization behavior.
- BLC and KTA data, parsing rules, search results, and permissions must remain separated by academy.
- Students must remain restricted to their assigned cycle. Do not broaden access while adding convenience features.
- PDF imports must retain Parsing Preview and explicit Confirm Import; parsed data must not be silently committed.
- Web must not render or reserve space for AdMob. Native iOS/Android ads may remain.
- Treat existing AdMob source-map messages during Create React App builds as known warnings; test, TypeScript, native compilation, or runtime failures are blockers.

## Verification

For normal UI or logic changes, run:

```powershell
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
```

Before a native release, follow `docs/release-checklist.md`. Do not run release/deployment steps without explicit approval.

## Maintaining project memory

Read `CONTINUE_HERE.md` when present as the cross-CLI entry point. Keep it and the top of `docs/NEXT_SESSION.md` synchronized after material actions, user-confirmed completions, verification results, and approval outcomes. Record the actual worktree, unfinished work, next concrete action, and external-action authorization boundaries. Update checkpoints during work, not only at the end or when context is exhausted. Do not assume another CLI has this conversation or that local changes are on GitHub.

After material changes, update `docs/PROJECT_HANDOFF.md` with:

- what changed;
- what remains unfinished;
- verification performed;
- any decision needed from the user.

Do not put secrets, real access codes, signing credentials, tokens, or personal data in the handoff file.
