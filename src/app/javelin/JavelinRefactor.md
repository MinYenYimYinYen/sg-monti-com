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
- **Server**: `javelinPlanServer.ts` (plan and post), `javelinContextServer.ts`, `javelinLatestServer.ts`, and the route `api/route.ts` with ops `previewGenLedger`, `previewDeposits`, `postGenLedger`, `postDeposits`, `getLatest`. Posting goes through the existing `postQboJournalEntries`.
- **Deposit field links**: `src/app/javelin/depositMapping/` (model, API, slice, selector, hook, UI). Rendered as a section of `/account/mapping`; `useAccount` loads it.
- **Migration**: done and then **removed** (tab, `src/app/javelin/migration/`, API op, thunk, state, test). The old maps were applied to QBO Id links first.
- **Check deposits (CK Deposits tab)**: typed-in date and total per row, no CSV. Source kind `ckDeposit` (hash of date and total). Debits the Checking Deposit Account, credits the RG Check Holding Acct. Occurrence is the lowest number not held by an occupied posting or an earlier row of the batch, so a second equal deposit posts as `-2` and is a **possible duplicate** that needs a confirm. New files: `ckDepositBuild.ts`, `ckDepositRows.ts`, `ckDepositFields.ts`, `ckDepositSlice.ts`, `ckDepositSelect.ts`, the `CkDeposit*` components, ops `previewCkDeposits` and `postCkDeposits`, `validateCkDepositRows`, `computeCkDepositHash`, and the banner line. The two account links share the deposit link collection, with a separate "Check deposit accounts" section. `DatePicker` got `hideCalendar` and `autoFocus`. Tab flow: date, amount, then the next row's date, with a row added when Tab leaves a filled amount on the last row. Routes are now `/javelin/ccDeposits` and `/javelin/ckDeposits`.
- **Confirm checkbox gap (old item 5)**: fixed on all three tabs. Ticking the box re-runs the preview at once.
- **Redux**: `javelinSlice` (holds all thunks), `depositSlice`, `ckDepositSlice`, selectors, `useJavelin`. `depositFieldMapping` and `ckDeposit` reducers registered.
- **UI**: now a tab-routed page. `layout.tsx` (admin gate, `PageLayout`, `TabNav`), `useJavelinDeps`, thin pages for General Ledger (`/javelin`), Deposits and Settings (last). Settings renders the shared `AccountMappingPanel`, which includes the deposit field section (it now warns when a field is unlinked). Panels: `GenLedgerPanel`, `DepositsPanel`, plus `LatestBanner`, `PlanEntryList`, `PostRunPanel`, `PostConfirmDialog`, headers, results tables and drop zones.
- **Removed**: `genLedgerTransform.ts`, `depositTransform.ts`, `AccountNameCell`, `AccountNumberCell`, `NameCell`, the old transform test.
- **Tests**: 35 passing in `src/__tests__/javelin/` (hashing, builders, classifier, banner wording). The migration test was deleted with the migration, so the count is now lower. Re-run to confirm.
- **Readme**: `javelin.readme.md` rewritten for the new flow.

### Verified

- IDE lint: no errors on the changed files.
- `npx vitest run src/__tests__/javelin`: 5 files, 35 tests pass.
- The migration was run in the UI and applied (before it was removed). Production Mongo (read-only) holds **5** documents in `javelindepositfieldmappings`: `salesAmount`, `refundAmount`, `chargeBackAmount`, `fees`, `netDeposit`. All 23 general ledger accounts were already linked.

### Not verified

- **`npx tsc --noEmit` has not been run.** Shared types changed (`JavelinState`, `DepositState`, `JournalEntryInput`), exports moved out of `depositSlice`, and a reducer was registered. Run it first thing.
- **The app has not been run.** No page, drop zone or dialog has been exercised in a browser. That includes the new tab routes and the Settings tab.
- **Nothing has been posted to QBO.** The DocNumber lookup (`DocNumber IN (...)`) is marked UNVERIFIED in `qboJournalEntryPayloadUtils.ts`.
- A read of `qbojournalentryposting` returned 0, but that name was a guess. Mongoose pluralizes the model name `QboJournalEntryPosting`, so the real collection is probably `qbojournalentrypostings`. Check with `list_schema_objects` (see the `mongo-read` skill) before relying on "no postings yet".

## What is left

In rough priority order:

1. **Run `npx tsc --noEmit`** and fix whatever it finds.
2. **Link `adjustmentAmount`** on the Settings tab (same panel as `/account/mapping`). The migration skipped it (the old map had no QBO name for it), so any deposit with a nonzero adjustment shows Blocked until it is linked. The deposit section now shows a warning for this.
3. **Check `110 - ACCOUNTS RECEIVABLE`** on the Settings tab. It needs a default customer, or entries touching it are blocked ("Needs customer").
3b. **Link the two check deposit accounts** on the Settings tab: Checking Deposit Account and RG Check Holding Acct. Until both are linked (to different QBO accounts), every check deposit shows Blocked. The section warns about it. If the holding account is a receivable type, it will also ask for a default customer.
4. **First live post.** Post one small general ledger day. In QBO confirm it exists, balances, and carries the `SJ...` Ref no. Then run reconcile on it, which also checks the DocNumber lookup. Reload Javelin and confirm the banner shows that date.
5. ~~Fix the confirm checkbox gap.~~ Done on all three tabs (the preview re-runs on toggle). Not exercised in a browser yet.
6. **Add Reconcile (and Verify) buttons to the Javelin page.** Reconcile exists only as the QBO API operation (`useQboJournalEntry().reconcile`). The `LatestBanner` warns about unconfirmed entries but offers no way to settle them.
7. **Decide who else may see Javelin.** It is admin only now because posting is. If non-admins should still see the preview and the banner, widen the roles on the preview and `getLatest` ops deliberately.
8. **Add tests.** `javelinInputUtils.ts` (including the new `validateCkDepositRows`) has none. The check deposit logic has none either, and it is pure and worth covering: `buildCkDepositEntries` (occurrence numbering against stored postings and earlier rows, a failed entry reusing its Ref no.), `planEntries` with a `ckDeposit` (occurrence above 1 is a possible duplicate, confirmed posts), `summarizeDraftRows`, `removePostedRows`, and the `ckDeposit` banner wording. Ask the user first, per the project rules.
8b. **Open risk: the confirmed second deposit.** It posts as `-2`. If that post times out and ends `unknown`, the `-2` Ref no. is held, and checking again shows the row as a `-3` possible duplicate instead of the unsettled `-2`. Reconcile the unknown entry first (the banner warns about unsettled entries).
9. **Cleanup, only after the user has tested end to end (including a live post):** remove `genLedgerAccountMap` and `depositAccountMap` from GlobalSettings (type, model, `baseGlobalSettings`, selectors in `globalSettingsSelect.ts`), then `GenLedgerAccountEntry`, `DepositAccountEntry`, `DepositAccountMap` and `emptyDepositAccountMap` from `JavelinTypes.ts`. Nothing reads these any more. Existing data in those fields can stay in the database. The user asked to hold this until the end-to-end test is done.

Open questions to ask the user when relevant: whether zero-net days should ever be recorded (option B: a "skipped" posting with no QBO entry), and whether the `SJ` prefix is what they want long term.

## When we are all done

**Update `src/app/javelin/javelin.readme.md`.** It was rewritten partway through this refactor, so it describes the intended end state, not necessarily the final code. Do a last pass against the finished code: the file map, the API table, the "Legacy account maps" section (delete it once the GlobalSettings cleanup is done), the "When the WorkWave deposit export changes shape" section, and the design decisions table. Then delete this file (`JavelinRefactor.md`), since it is only a handoff note.
