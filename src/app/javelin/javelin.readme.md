﻿# Javelin

Javelin turns CRM CSV exports into QuickBooks Online (QBO) journal entries and posts them **directly through the QBO API**. It no longer produces CSVs for QBO's import tool. Every entry sent is stored in our own Mongo data with its status, so the app can tell the user what was last posted, and can refuse to post the same data twice.

Flow: **drop CSV -> check entries -> post**. The browser only parses the CSV. The server rebuilds every entry from stored account links, so the lines that reach the books are never taken from the browser. The page is **admin only**, because every operation reads or writes the live books.

| Tab | Input | Entry it makes | Latest-entry banner |
|---|---|---|---|
| **General Ledger** | One or more CRM General Ledger CSVs, one per day, named `YYYY-MM-DD.csv` | One entry per file (per day) | Date of the last general ledger entry, and the day to export from next |
| **CC Deposits** | One WorkWave credit card processing deposit CSV | One entry per deposit row | Date and **net deposit** (what hit the bank) of the last credit card deposit entry |
| **CK Deposits** | Typed in: a date and a deposit total per row. No CSV | One entry per row: debit the Checking Deposit Account, credit the RG Check Holding Acct | Date and total of the last check deposit entry |
| **Settings** | none | none | Renders the shared account mapping (`AccountMappingPanel`), including the credit card deposit fields and the check deposit accounts |

---

## File Map

| File | Purpose |
|---|---|
| `layout.tsx` | Admin gate, `PageLayout` header with `TabNav` (General Ledger, CC Deposits, CK Deposits, Settings). The only caller of `useJavelinDeps` |
| `useJavelinDeps.ts` | Loads the latest-entry info for every tab |
| `page.tsx`, `ccDeposits/page.tsx`, `ckDeposits/page.tsx`, `settings/page.tsx` | Thin tab pages: `GenLedgerPanel`, `DepositsPanel`, `CkDepositsPanel`, `AccountMappingPanel` |
| `JavelinTypes.ts` | Types for both flows, the server plan, and the legacy map types |
| `javelinSlice.ts` / `javelinSelect.ts` | General ledger state. Also holds **all** thunks (both flows share one contract and route) |
| `depositSlice.ts` / `depositSelect.ts` | Credit card deposit state. Listens to the deposit thunks in `javelinSlice` |
| `ckDepositSlice.ts` / `ckDepositSelect.ts` | Check deposit state: the typed rows (kept in Redux so they survive switching tabs), plan and last run. Listens to the check deposit thunks. A post removes the rows that posted |
| `useJavelin.ts` | Actions only: preview, post, refresh latest |
| `api/JavelinContract.ts`, `api/route.ts` | RPC contract and admin-only route (`createQboRpcHandler`) |
| `_lib/entryBuild.ts` | Pure: `buildGenLedgerEntry`, `buildDocNumber`, `resolveName`, shared types |
| `_lib/depositEntryBuild.ts` | Pure: `buildDepositEntries` |
| `_lib/ckDepositBuild.ts` | Pure: `buildCkDepositEntries`, including the occurrence numbering |
| `_lib/ckDepositRows.ts` | Pure: draft row helpers (`summarizeDraftRows`, `removePostedRows`) |
| `_lib/ckDepositFields.ts` | The two check deposit link keys, their labels, and the combined list of every deposit link key |
| `_lib/entrySourceHash.ts` | Server only: SHA-256 of the CRM source data |
| `_lib/entryPlanUtils.ts` | Pure: classifies each entry (ready, duplicate, ...) against stored postings |
| `_lib/javelinPlanServer.ts` | Server: loads context, plans, and posts through the QBO posting server |
| `_lib/javelinContextServer.ts`, `javelinLatestServer.ts` | Server reads: links, accounts, relevant postings, latest entries |
| `_lib/javelinInputUtils.ts` | Pure runtime validation of what the browser sends |
| `_lib/genLedgerRows.ts`, `depositFields.ts`, `latestUtils.ts` | Pure helpers (zero-net split, deposit field rules, banner wording) |
| `depositMapping/` | Deposit account -> QBO account links (model, API, slice, select, hook, UI). Holds the WorkWave export fields **and** the two check deposit accounts |
| `_lib/components/` | `GenLedgerPanel`, `DepositsPanel`, `CkDepositsPanel` (`CkDepositRows`, `CkDepositHeader`, `CkDepositResults`), headers, drop zones, `PlanEntryList`, `PostRunPanel`, `PostConfirmDialog`, `LatestBanner` |

Outside this folder:

- `src/app/qbo/journalEntry/` does the actual posting (see below). Javelin adds an optional `source` to its `JournalEntryInput`, posting content and Mongoose schema.
- `src/app/account/` holds the RealGreen account -> QBO account links that general ledger entries use. It is the **single source of truth** for how QBO accounts are mapped in this app. `AccountMappingPanel` also renders `DepositFieldMappingSection`, and `useAccount` loads the deposit links. Javelin's Settings tab renders that same panel, so there is no second copy.
- `src/store/reducers/index.ts` registers `javelin`, `deposit`, `ckDeposit` and `depositFieldMapping`.
- `src/components/DatePicker.tsx` has two optional props added for fast entry: `hideCalendar` (no calendar button, so Tab goes straight to the next field) and `autoFocus`. The typed-date parsing on blur is the point: `1027`, `10/27`, `102726`, `today` and `fri` all work.

---

## Identity and duplicate prevention

**Entry identity is a hash of the CRM source data**, never of the QBO lines, so remapping an account later cannot change it. The server computes it (Node `crypto`).

| Kind | Hash input |
|---|---|
| General ledger | `genLedger`, the date, and the sorted `crmAccount=netCents` pairs (zero-net rows excluded) |
| Deposit | `deposit`, the date, and the six WorkWave amounts in cents, in field order |
| Check deposit | `ckDeposit`, the date, and the total in cents |

Changing the hashed fields or their order changes every hash and breaks duplicate detection against stored postings.

**Ref no. sent to QBO** (`buildDocNumber`): `SJ` + 12 hex characters of the hash + `-` + occurrence (at most 21 characters). It is the only way a timed-out post can be settled: `reconcile` looks the entry up in QBO by it. The occurrence is always 1 for a ledger day. For credit card deposits it counts identical rows within a file, as credit card rows do. **For check deposits it is the lowest number not already held** by an occupied posting (`posted`, `posting` or `unknown`) of the same date and total, or by an earlier row of the same batch. So the second equal deposit is `-2`, and the plan calls any occurrence above 1 a **possible duplicate** that posts only if confirmed. A `failed` or `pending` entry holds nothing, so a retry sends the same Ref no. Descriptive text (`Javelin general ledger 2026-10-21 (file.csv)`) goes in the entry's private note.

Three layers stop duplicates:

1. **Plan (`planEntries`)**, shown to the user before anything is sent:
   - **duplicate**: the same DocNumber is already `posted`, `posting` or `unknown`. A `failed` or `pending` one may be tried again. The same data twice in one upload counts too (only the first can post).
   - **possibleDuplicate**: a different DocNumber, but an occupied posting of the same kind and date (for a deposit, also the same net deposit). It posts only if the user ticks the confirm box. This catches a re-exported day whose data changed.
2. **Posting server (existing)**: the unique `docNumber` index, an atomic claim before sending, and a QBO lookup by DocNumber.
3. **Re-derivation**: `postGenLedger` and `postDeposits` rebuild and re-plan on the server, so a stale browser plan cannot post anything the server would not.

---

## Storage

Postings live in the existing `QboJournalEntryPosting` collection. `source` is optional (hand-posted entries have none):

```ts
type JournalEntrySource =
  | { kind: "genLedger"; sourceHash; fileName; sourceLines: { crmAccount; netCents }[] }
  | { kind: "deposit"; sourceHash; occurrence; fileName; sourceFields: Record<string, number>; netDepositCents }
  | { kind: "ckDeposit"; sourceHash; occurrence; amountCents };
```

Indexes: `{ "source.kind": 1, txnDate: -1 }` (latest of a kind) and `{ "source.sourceHash": 1 }`.

---

## Account links

- **General ledger**: a CRM account name such as `102.2 - CK PAYMENTS` is linked by the number before `" - "` (`rgAccountIdFromCrmName`) to an `AccountMappingDoc` (`rgAccountId` -> `qboAccountId`, with an optional default Customer or Vendor). Edited on `/account/mapping`.
- **Deposits**: `DepositFieldMappingDoc` (`field` -> `qboAccountId`, with an optional default name). Six fixed fields: `salesAmount`, `refundAmount`, `chargeBackAmount`, `adjustmentAmount`, `fees`, `netDeposit`. Edited in the "Credit card deposit fields" section of `/account/mapping`, which is also the Javelin Settings tab. A warning shows there when a field is unlinked or has a problem.
- **Check deposits**: two more keys in the same collection, `ckDepositAccount` (Checking Deposit Account, debited) and `ckHoldingAccount` (RG Check Holding Acct, credited). They are **not WorkWave export columns**: they live in `CK_DEPOSIT_LINK_KEYS` and a separate "Check deposit accounts" section (`CkDepositMappingSection`), and the CSV parser, hash and validation never see them (`loadDepositLinks` returns the WorkWave fields only, `loadCkDepositLinks` the two accounts). Both must be linked, to different QBO accounts.
- A default name is put on a line only when the QBO account takes one (Customer on Accounts Receivable, Vendor on Accounts Payable) and the stored name is of that kind.
- An unlinked account or field makes the entry **blocked** with a message naming it.

### Sides and amounts

- General ledger: positive net is a Debit, negative a Credit. Amounts are whole cents (`toCents`). Lines that net to $0.00 are dropped, and a day with none left is **empty** (nothing is posted and no record is stored).
- Deposits: `FIELD_NATURAL_SIDE` gives each field's side for a positive value, and a negative value flips it. `refundAmount` is `debit` on purpose: mapping refunds to A/R here would double-hit A/R, because the general ledger flow already debits it. Refund, Chargeback and Adjustment lines carry a description so lines sharing one QBO account stay distinguishable.

---

## API (`/javelin/api`, admin only)

| Op | Does |
|---|---|
| `previewGenLedger`, `previewDeposits` | Builds and classifies entries. Writes nothing |
| `postGenLedger`, `postDeposits` | Re-plans on the server, then posts what is ready through `postQboJournalEntries` (batches of 30, stops after a batch that does not fully post) |
| `previewCkDeposits`, `postCkDeposits` | Same plan and post path for typed-in check deposits. Rows are `{ date, amount }`. Validated on the server: real date, not more than a day ahead, amount above zero in whole cents, at most 200 rows |
| `getLatest` | Last `posted` entry of each kind, plus the DocNumbers of `unknown` or `posting` ones |

Entries older than the last posted date are not treated specially: only duplicates are blocked.

### Latest-entry banner

`LatestBanner` shows what to export next. When entries are unconfirmed (`unknown` or stuck `posting`), it warns that the date cannot be fully trusted. Reconcile them with the QBO journal entry reconcile operation. A day that netted to zero stores nothing, so the banner can read as if that day was skipped. Re-uploading it just shows "Nothing to post".

### Check deposit entry (the CK Deposits tab)

`CkDepositRows` is built for the keyboard. One empty row shows at first. **Tab** goes date -> amount -> the next row's date. Tab out of a filled amount on the **last** row adds a row first (`preventDefault`, so the browser's own Tab does not skip the new date), and the new row's date takes focus through `autoFocus`. Shift+Tab never adds a row. Every field selects its text on focus. The date field takes shorthand, and a bad entry snaps back to the last valid date on blur. A date typed without a year uses the current year. The amount is a number input with the spin arrows hidden. Rows with neither field filled are ignored. A row with only one of the two disables **Check entries**. The remove buttons are skipped by Tab.

Posted rows are removed from the list, and `postCkDeposits` leaves the rest. Checking a posted row again would number it as a second deposit and flag it. Ticking "post this possible duplicate" re-runs the check at once on all three tabs, so the plan updates without pressing Check entries again.

Two equal deposits on one day in separate sessions need that confirm: nothing tells them apart except the date and the total.

---

## Legacy account maps

The old name-based maps (`GlobalSettings.genLedgerAccountMap`, `depositAccountMap`) were migrated to QBO Id links and the migration tool is gone. Nothing reads the old maps any more. They are still in GlobalSettings (type, model, `baseGlobalSettings`, selectors) and marked LEGACY in `JavelinTypes.ts`. Remove them, with `GenLedgerAccountEntry`, `DepositAccountEntry`, `DepositAccountMap` and `emptyDepositAccountMap`, **after the end-to-end test**. The data can stay in the database.

---

## Page layout

A tab-routed page (`layout.tsx`): `/javelin` (General Ledger), `/javelin/ccDeposits`, `/javelin/ckDeposits`, `/javelin/settings`, with Settings last. The layout shows an "Admins only" alert to non-admins, so nothing loads for them. For an admin, `JavelinShell` calls `useJavelinDeps()` (the latest entries, `staleTime` 60 s) and renders the header and tabs. Each flow tab is: `LatestBanner`, a header (**Check entries**, **Post to QuickBooks** with a confirm dialog, **Clear**), a drop zone, then a results area with its own `overflow-y-auto`. The Settings tab is `AccountMappingPanel`, which loads the QBO account, customer, vendor and link data itself, so those lists load only when that tab opens.

---

## When the WorkWave deposit export changes shape

The deposit columns are hard-coded on purpose. A fixed set of six fields is simpler than a data-driven field list, and the export rarely changes. If WorkWave renames, adds or removes a column, these places must change together:

| Place | What it holds |
|---|---|
| `src/app/csv/deposits/depositParser.ts` | Column header -> property map, required columns, per-column transformation, Zod schema. A renamed header only needs this file, as long as the property name it maps to stays the same |
| `JavelinTypes.ts` | The `DepositField` union and `DepositRow` |
| `_lib/depositFields.ts` | `DEPOSIT_FIELDS`, labels, line descriptions and `FIELD_NATURAL_SIDE` |
| `_lib/depositEntryBuild.ts` | `depositFieldCents` (one entry per field) |
| `_lib/entrySourceHash.ts` | Hashes every field in `DEPOSIT_FIELDS`, zeros included |
| `_lib/javelinInputUtils.ts` | Runtime validation (iterates `DEPOSIT_FIELDS`) |
| `depositMapping/DepositFieldMappingModel.ts`, `depositMapping/api/route.ts` | Enum and validation (both use `DEPOSIT_FIELDS`) |
| `src/__tests__/javelin/depositEntryBuild.test.ts` | Row fixtures |

**Duplicate protection is the trap.** The deposit hash covers every field in `DEPOSIT_FIELDS`, so adding a field (even one that is zero on old rows) changes the hash of every deposit already posted. Stored postings then no longer match a re-upload, and the same deposit would post twice. Before adding a field, change the hash to include only the nonzero fields, sorted by name, and check how that affects the existing postings. Renaming a field has the same effect, because the field name is part of the hashed text. Keep the old name in the hash, or accept that old data no longer matches.

A new field also needs a link on the Settings tab before any deposit with a nonzero amount in it can post. Stored link documents are keyed by the field name, so a renamed field orphans its link.

**If the export changes often**, refactor rather than patch. Store the field definitions as data (stable key, CSV header, label, posting side, optional line description, plus the QBO link) and have the parser, builder, hash and validation iterate that list instead of naming fields. Make the hash cover nonzero posted fields only, and report an unrecognized column as a visible blocker, so a new export layout fails loudly instead of being silently ignored. Then a format change is an edit in the Settings tab instead of a code change.

---

## Design Decisions

| Question | Decision |
|---|---|
| CSV export for QBO import? | Removed. Entries are sent through the API |
| Where does identity come from? | A server-side hash of CRM source data, not a prefix or a counter |
| Who builds the lines? | The server, from stored links. The browser never sends lines |
| Same data, different content, same date? | Possible duplicate: needs an explicit confirm |
| Send an identifier to QBO? | Yes, the short `SJ...` Ref no., so timed-out posts can be reconciled |
| Banner amount for deposits? | Net deposit, what hit the bank |
| Check deposits: what is a duplicate? | The same date and total. One deposit per day is normal, so a second equal one is a possible duplicate that needs a confirm, and it posts as `-2` |
| Check deposit accounts? | Two links in the deposit link collection, kept out of the WorkWave field list so a CSV change never touches them |
| Zero-net days? | Nothing stored. The banner shows the last day that had an entry |
| Who can use it? | Admins only (the API is admin only, so the page is too) |
