# Admin Auth Migration Plan

This note captures the post-cycle plan for securing Firebase writes without removing the simple student/viewer code login.

## Future Trigger

When the user says `upgrade` or `upgrade 하자`, treat it as a request to implement this Firebase Auth admin-write upgrade in this repository.

Before coding, do this:

1. Read this document.
2. Inspect the current Firebase config, login flow, and write paths.
3. Ask for or confirm the shared KATUSA owner email only if it is needed for setup.
4. Implement the app changes first.
5. Provide exact Firebase Console setup steps and Realtime Database Rules for the user to apply.
6. Run `npm run build`.
7. Commit and push only if the user asks for it.

## Goal

- Keep simple code login for students and viewers.
- Require Firebase Auth for anyone who can write schedule data.
- Use a shared KATUSA owner account for handoff instead of a personal account.
- Let the owner manage admin users from inside the webpage after the initial setup.

## Recommended Accounts

- Create one shared owner account for KATUSA handoff, for example `blc.katusa.admin@...`.
- Store that account in Firebase Auth.
- Add its UID under `/admins/{uid}` with `role: "owner"`.
- Use individual admin accounts for instructors or staff who need schedule editing access.
- Change the shared owner password during handoff.
- Avoid tying recovery or 2FA only to one person who will leave.

## Roles

- `owner`: can edit schedules and manage admin users.
- `admin`: can edit schedules, locations, uniforms, and imports.
- `student` / `viewer`: can read only and continue using simple code login.

## Database Shape

```json
{
  "admins": {
    "OWNER_UID": {
      "email": "blc.katusa.admin@example.com",
      "role": "owner",
      "createdAt": 1710000000000
    },
    "ADMIN_UID": {
      "email": "instructor@example.com",
      "role": "admin",
      "createdAt": 1710000000000
    }
  }
}
```

## Realtime Database Rules Direction

```json
{
  "rules": {
    ".read": true,
    "schedules": {
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "locations": {
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "uniforms": {
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "admins": {
      ".read": "auth != null && root.child('admins').child(auth.uid).exists()",
      ".write": "auth != null && root.child('admins').child(auth.uid).child('role').val() === 'owner'"
    }
  }
}
```

These rules should be tightened and tested in Firebase before production use.

## Implementation Steps

1. Enable Email/Password sign-in in Firebase Authentication.
2. Create the shared KATUSA owner account in Firebase Auth.
3. Add the owner account UID to `/admins/{uid}` with `role: "owner"`.
4. Update Realtime Database Rules so writes require an authenticated UID in `/admins`.
5. Add Firebase Auth admin login to the app.
6. Keep the existing simple code login for students/viewers.
7. On admin login, check `/admins/{uid}` before showing admin tools.
8. Add an owner-only admin management screen.
9. Let owner approve/remove admins and change `role` between `owner` and `admin`.
10. Prevent deleting the last owner.
11. Prevent or strongly warn before an owner removes their own owner access.
12. Test student/viewer read-only access and admin write access.

## Preferred Admin Onboarding Flow

Use this flow to avoid Cloud Functions for now:

1. New admin creates or receives a Firebase Auth email/password account.
2. They cannot write until approved.
3. Owner logs into the webpage.
4. Owner adds that user's UID/email to `/admins`.
5. New admin refreshes or logs in again and can edit schedules.

## Later Upgrade Option

If invitation emails or automatic account creation are needed, add Cloud Functions later. That would allow owners to invite admins by email from the app, but it adds more setup and maintenance.
