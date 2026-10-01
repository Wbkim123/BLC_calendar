# NCOA Schedule application architecture

The released application remains one iOS/Android app and keeps its existing
bundle/package identifier. BLC and KTA are feature scopes inside that app.

## Source boundaries

- `src/shared`: academy-neutral UI and infrastructure.
- `src/features/blc`: BLC-only behavior and PDF parsing.
- `src/features/kta`: KTA-only behavior and PDF parsing.
- `src/features/auth`: access-code parsing and role/scope resolution.
- `src/features/schedule-import`: academy-neutral import contracts and routing.
- `src/config`: academy names, paths, and defaults.

## Production data compatibility

BLC continues to use the released root paths (`schedules`, `locations`, and
`uniforms`). KTA uses `academies/kta/*`. This avoids a risky BLC migration while
preventing KTA imports and edits from overwriting BLC data.

## Access model

| Code | Scope | Access |
| --- | --- | --- |
| `NCOA6120` | NCOA | BLC/KTA management and academy switcher |
| `BLC2002` | BLC | Schedule import and editing |
| `BLC0209` | BLC | Senior/SGL read access |
| `BLCMMYY` | BLC cycle | Active-cycle student access |
| `KTA2002` | KTA | Schedule import and editing |
| `KTA0209` | KTA | Senior/SGL read access |
| `KTAMMYY` | KTA cycle | Active-cycle student access |

Codes are case-insensitive. Administrator codes are verified by a Firebase
Function and converted into scoped Firebase Auth claims. UI checks are never a
substitute for Database Rules.

## Deployment prerequisite

Before deploying the new Function, create the `NCOA_ACCESS_CODE` Firebase
Functions secret. Its value may be `6120` or `NCOA6120`. The existing
`ADMIN_ACCESS_CODE` remains the numeric importer secret (`2002`) and is accepted
only with the BLC/KTA prefix in the new UI.

KTA notification topics must be namespaced before KTA is released so cycles with
the same number cannot receive each other's notifications.
