# Javelin Refactor: handoff

Working notes for picking this refactor back up. Read this first, then the required reading, then "What is left".

## Context

Javelin used to convert CRM CSV exports into QuickBooks Online (QBO) journal entry **import CSVs**. We now have a QBO integration module (`src/app/qbo/`), so Javelin posts journal entries **directly through the QBO API** instead. The CSV export is gone.

Goals, as the user stated them:

1. Send journal entries to QBO through the API, using the account links in `src/app/account/` (RealGreen account -> QBO account Id).
2. Store **every** entry we send in our own Mongo data with its success status, the way credit card rows are stored.
3. Tell the user the date of the last general ledger ("SAGL") entry and the date and amount of the last credit card payment (deposit) entry, so they know what CSV data to export next.
4. Prevent duplicate entries.

Decisions made with the user (do not relitigate without asking):

- **Identity = a server-computed hash of the CRM source data**, never of the QBO lines. Same idea as the credit card row hash (`src/app/qbo/importCCTxn/_lib/importRowHash.ts`).
- **A short Ref no. is sent to QBO**: `SJ` + 12 hex characters + `-occurrence` (max 21 characters). It is the only way a timed-out post can be settled, because reconcile looks entries up by DocNumber. (`SG...` is already the credit card marker.)
- **Source metadata (kind, hash, file name, source lines) lives on our posting only**, in the existing `QboJournalEntryPosting` collection, as an optional `source` field.
- **The server builds the lines** from stored links. The browser sends parsed CSV data only.
- **Deposit banner amount = net deposit** (what hit the bank).
- **CSV export removed completely.** The journal number prefix input is gone too.
- **Admin only**, page and API.
- **Zero-net general ledger days store nothing** ("option A"). The banner shows the last day that had an entry.
- **Possible duplicates** (different content, same kind and date; for deposits also the same net deposit) need an explicit confirm. They never post silently.
- **Deposit fields** (the six WorkWave export columns) get their own link collection, keyed by field, with QBO account Ids. They are not RealGreen accounts.

## Required reading

Read these before changing anything:

| File | Why |
|---|---|
| `src/app/javelin/javelin.readme.md` | The module reference. Rewritten for the new flow; keep it in step with the code |
| `src/app/qbo/journalEntry/types/QboJournalEntryTypes.ts` | `JournalEntryInput`, `JournalEntryPosting`, the new `JournalEntrySource`, statuses |
| `src/app/qbo/journalEntry/_lib/qboJournalEntryServer.ts` | The only code that posts. Safety rules are in its header comment |
| `src/app/qbo/journalEntry/_lib/qboJournalEntryPreflightServer.ts` and `...ReconcileServer.ts` | Pre-flight checks and the reconcile (settle unknown entries) path |
| `src/app/javelin/_lib/entryPlanUtils.ts` | How duplicates and lookalikes are classified |
| `src/app/account/AccountMappingTypes.ts`, `_lib/accountLinks.ts` | The link and status model that general ledger and deposit links share |
| `src/lib/api/api.readme.md`, `src/store/store.readme.md` | Required before touching any route, thunk or slice |
| `src/__tests__/testing.readme.md` | Before touching tests |

Project rules that bite here (see `AGENTS.md`): no `useMemo`/`useCallback`; function props end in `Action`; hooks expose actions only, components select state directly; multi-argument functions take an object; types over interfaces; never run `tsc`, a build or a dev server (remind the user to run `npx tsc --noEmit` instead); new markdown files get a UTF-8 BOM; skills in `.claude/skills/` (`data-module`, `api-route`, `mongo-read`, `write-tests`) apply.

## Where we left off

### Built

- **Storage**: `source` on `JournalEntryInput`, posting content and the Mongoose schema, with indexes on `{ "source.kind", txnDate }` and `source.sourceHash`.
- **Pure logic** (`src/app/javelin/_lib/`): source hashing (`entrySourceHash.ts`), entry builders (`entryBuild.ts`, `depositEntryBuild.ts`), the plan classifier (`entryPlanUtils.ts`), input validation (`javelinInputUtils.ts`), banner wording (`latestUtils.ts`), shared deposit field rules (`depositFields.ts`).
- **Server**: `javelinPlanServer.ts` (plan and post), `javelinContextServer.ts`, `javelinLatestServer.ts`, and the route `api/route.ts` with ops `previewGenLedger`, `previewDeposits`, `postGenLedger`, `postDeposits`, `getLatest`, `migrateMappings`. Posting goes through the existing `postQboJournalEntries`.
- **Deposit field links**: `src/app/javelin/depositMapping/` (model, API, slice, selector, hook, UI). Rendered as a section of `/account/mapping`; `useAccount` loads it.
- **Migration** (`src/app/javelin/migration/`): dry run and apply of the old name-based maps to QBO Id links.
- **Redux**: `javelinSlice` (holds all thunks), `depositSlice`, selectors, `useJavelin`. `depositFieldMapping` reducer registered.
- **UI**: admin gate, three tabs, `LatestBanner`, `PlanEntryList`, `PostRunPanel`, `PostConfirmDialog`, `MigrationPanel`, new headers, results tables and drop zones.
- **Removed**: `genLedgerTransform.ts`, `depositTransform.ts`, `AccountNameCell`, `AccountNumberCell`, `NameCell`, the old transform test.
- **Tests**: 35 passing in `src/__tests__/javelin/` (hashing, builders, classifier, migration, banner wording).
- **Readme**: `javelin.readme.md` rewritten for the new flow.

### Verified

- IDE lint: no errors on the changed files.
- `npx vitest run src/__tests__/javelin`: 5 files, 35 tests pass.
- The migration was run in the UI and applied. Production Mongo (read-only) holds **5** documents in `javelindepositfieldmappings`: `salesAmount`, `refundAmount`, `chargeBackAmount`, `fees`, `netDeposit`. All 23 general ledger accounts were already linked.

### Not verified

- **`npx tsc --noEmit` has not been run.** Shared types changed (`JavelinState`, `DepositState`, `JournalEntryInput`), exports moved out of `depositSlice`, and a reducer was registered. Run it first thing.
- **The app has not been run.** No page, drop zone or dialog has been exercised in a browser.
- **Nothing has been posted to QBO.** The DocNumber lookup (`DocNumber IN (...)`) is marked UNVERIFIED in `qboJournalEntryPayloadUtils.ts`.
- A read of `qbojournalentryposting` returned 0, but that name was a guess. Mongoose pluralizes the model name `QboJournalEntryPosting`, so the real collection is probably `qbojournalentrypostings`. Check with `list_schema_objects` (see the `mongo-read` skill) before relying on "no postings yet".

## What is left

In rough priority order:

1. **Run `npx tsc --noEmit`** and fix whatever it finds.
2. **Link `adjustmentAmount`** on `/account/mapping`. The migration skipped it (the old map had no QBO name for it), so any deposit with a nonzero adjustment shows Blocked until it is linked.
3. **Check `110 - ACCOUNTS RECEIVABLE`** on `/account/mapping`. It needs a default customer, or entries touching it are blocked ("Needs customer").
4. **First live post.** Post one small general ledger day. In QBO confirm it exists, balances, and carries the `SJ...` Ref no. Then run reconcile on it, which also checks the DocNumber lookup. Reload Javelin and confirm the banner shows that date.
5. **Fix the confirm checkbox gap.** Ticking "post this possible duplicate" only changes `confirmedDocNumbers` in the slice. The plan still says `possibleDuplicate` and the Post button counts only `ready` entries, so the user must press **Check entries** again before it takes effect. Either re-run the preview on toggle, or make the button explain it. The server side is already correct: `postGenLedger` and `postDeposits` re-plan with the confirmed list.
6. **Add Reconcile (and Verify) buttons to the Javelin page.** Reconcile exists only as the QBO API operation (`useQboJournalEntry().reconcile`). The `LatestBanner` warns about unconfirmed entries but offers no way to settle them.
7. **Decide who else may see Javelin.** It is admin only now because posting is. If non-admins should still see the preview and the banner, widen the roles on the preview and `getLatest` ops deliberately.
8. **Add tests for `javelinInputUtils.ts`** (runtime validation of browser payloads). The pure helpers elsewhere are covered.
9. **Cleanup after the user has checked the migration and a live post:** remove `genLedgerAccountMap` and `depositAccountMap` from GlobalSettings (type, model, `baseGlobalSettings`, selectors), then `GenLedgerAccountEntry`, `DepositAccountEntry`, `DepositAccountMap` and `emptyDepositAccountMap` from `JavelinTypes.ts`, and the **Migrate mappings** tab with `src/app/javelin/migration/`. Existing data in those fields can stay in the database.

Open questions to ask the user when relevant: whether zero-net days should ever be recorded (option B: a "skipped" posting with no QBO entry), and whether the `SJ` prefix is what they want long term.

## When we are all done

**Update `src/app/javelin/javelin.readme.md`.** It was rewritten partway through this refactor, so it describes the intended end state, not necessarily the final code. Do a last pass against the finished code: the file map, the API table, the migration section (delete it if the migration tab is removed), the legacy-field notes, and the design decisions table. Then delete this file (`JavelinRefactor.md`), since it is only a handoff note.
