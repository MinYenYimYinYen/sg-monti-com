# QBO Integration - Phase 3: Reference Data Mirror

## Required Reading

- Skill `data-module`, plus `src/store/store.readme.md`, `src/lib/api/api.readme.md`, `src/lib/mongoose/mongo.readme.md`
- An existing synced module for the pattern: `src/app/realGreen/employee/`, `src/app/realGreen/syncMetadata/`, `src/app/vercelCron/mirrorSync/api/route.ts`

## Goal

Mirror the QBO vendors and accounts we need into MongoDB so mapping dropdowns are instant and posting never waits on QBO for reads.

## Entities

- **Vendor**: `qboId`, `displayName`, `active`. Natural key: `qboId` (QBO's own ID is the only stable key; `displayName` is unique in QBO but can be renamed).
- **Account**: `qboId`, `name`, `acctNum`, `accountType`, `accountSubType`, `fullyQualifiedName`, `active`. Split in selectors into:
  - credit card accounts (`AccountType: Credit Card`)
  - expense accounts (`Expense`, `Cost of Goods Sold`, `Other Expense` as needed; confirm which types you use)
- No classes, locations, items, or customers.

## Design

- Read via the QBO query endpoint (`select * from Vendor`) with `STARTPOSITION` / `MAXRESULTS` pagination (max 1000 per page).
- `Raw` -> `remap*` -> `Core` -> `Doc` per the RealGreen pipeline. Include inactive records in the mirror with `active` so mappings pointing at them can be flagged.
- Sync triggers: manual "Sync from QBO" button (office/admin) and an optional cron like `mirrorSync`. Upsert by `qboId`; mark records no longer returned as inactive rather than deleting.
- Selectors return hydrated types. Hooks expose actions only.
- Pre-flight helper for Phase 6: given a vendor `qboId` and account `qboId`, answer whether each is currently active in the mirror (pure function).

## Your Tasks

- [ ] Confirm which QBO account types count as "expense accounts" for the mapping dropdown.
- [ ] Confirm which accounts are the credit card accounts (should be `Credit Card` type in QBO).
- [ ] After the sync runs, spot-check the mirrored vendors and accounts against QBO.

## Our Tasks

- [ ] `vendor/` and `account/` modules (types, models, contract, route, slice, select, hook)
- [ ] Paginated query helper in the QBO layer
- [ ] Manual sync op and optional cron
- [ ] Active-check pure helper with tests if you want them

## Done Criteria

- [ ] Vendors and accounts mirrored from the sandbox company.
- [ ] Re-running sync is idempotent.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.