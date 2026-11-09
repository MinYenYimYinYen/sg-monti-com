﻿# Javelin

Javelin turns CRM CSV exports into QuickBooks Online (QBO) journal entries and posts them **directly through the QBO API**. It no longer produces CSVs for QBO's import tool. Every entry sent is stored in our own Mongo data with its status, so the app can tell the user what was last posted, and can refuse to post the same data twice.

Flow: **drop CSV -> check entries -> post**. The browser only parses the CSV. The server rebuilds every entry from stored account links, so the lines that reach the books are never taken from the browser. The page is **admin only**, because every operation reads or writes the live books.

| Tab | Input | Entry it makes | Latest-entry banner |
|---|---|---|---|
| **General Ledger** | One or more CRM General Ledger CSVs, one per day, named `YYYY-MM-DD.csv` | One entry per file (per day) | Date of the last general ledger entry, and the day to export from next |
| **Deposits** | One WorkWave credit card processing deposit CSV | One entry per deposit row | Date and **net deposit** (what hit the bank) of the last deposit entry |
| **Migrate mappings** | none | none | One-time move of the old name-based maps to QBO Id links |

---

## File Map

| File | Purpose |
|---|---|
| `page.tsx` | Admin gate, tabs, loads the latest-entry info on mount |
| `JavelinTypes.ts` | Types for both flows, the server plan, and the legacy map types |
| `javelinSlice.ts` / `javelinSelect.ts` | General ledger state. Also holds **all** thunks (both flows share one contract and route) |
| `depositSlice.ts` / `depositSelect.ts` | Deposit state. Listens to the deposit thunks in `javelinSlice` |
| `useJavelin.ts` | Actions only: preview, post, refresh latest, migrate |
| `api/JavelinContract.ts`, `api/route.ts` | RPC contract and admin-only route (`createQboRpcHandler`) |
| `_lib/entryBuild.ts` | Pure: `buildGenLedgerEntry`, `buildDocNumber`, `resolveName`, shared types |
| `_lib/depositEntryBuild.ts` | Pure: `buildDepositEntries` |
| `_lib/entrySourceHash.ts` | Server only: SHA-256 of the CRM source data |
| `_lib/entryPlanUtils.ts` | Pure: classifies each entry (ready, duplicate, ...) against stored postings |
| `_lib/javelinPlanServer.ts` | Server: loads context, plans, and posts through the QBO posting server |
| `_lib/javelinContextServer.ts`, `javelinLatestServer.ts` | Server reads: links, accounts, relevant postings, latest entries |
| `_lib/javelinInputUtils.ts` | Pure runtime validation of what the browser sends |
| `_lib/genLedgerRows.ts`, `depositFields.ts`, `latestUtils.ts` | Pure helpers (zero-net split, deposit field rules, banner wording) |
| `depositMapping/` | Deposit field -> QBO account links (model, API, slice, select, hook, UI) |
| `migration/` | Legacy-map migration (pure matching, server, types) |
| `_lib/components/` | Headers, drop zones, `PlanEntryList`, `PostRunPanel`, `PostConfirmDialog`, `LatestBanner`, `MigrationPanel` |

Outside this folder:

- `src/app/qbo/journalEntry/` does the actual posting (see below). Javelin adds an optional `source` to its `JournalEntryInput`, posting content and Mongoose schema.
- `src/app/account/` holds the RealGreen account -> QBO account links that general ledger entries use. `AccountMappingPanel` also renders `DepositFieldMappingSection`, and `useAccount` loads the deposit links.
- `src/store/reducers/index.ts` registers `javelin`, `deposit` and `depositFieldMapping`.

---

## Identity and duplicate prevention

**Entry identity is a hash of the CRM source data**, never of the QBO lines, so remapping an account later cannot change it. The server computes it (Node `crypto`).

| Kind | Hash input |
|---|---|
| General ledger | `genLedger`, the date, and the sorted `crmAccount=netCents` pairs (zero-net rows excluded) |
| Deposit | `deposit`, the date, and the six WorkWave amounts in cents, in field order |

Changing the hashed fields or their order changes every hash and breaks duplicate detection against stored postings.

**Ref no. sent to QBO** (`buildDocNumber`): `SJ` + 12 hex characters of the hash + `-` + occurrence (at most 21 characters). It is the only way a timed-out post can be settled: `reconcile` looks the entry up in QBO by it. The occurrence is always 1 for a ledger day. For deposits it counts identical rows within a file, as credit card rows do. Descriptive text (`Javelin general ledger 2026-10-21 (file.csv)`) goes in the entry's private note.

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
  | { kind: "deposit"; sourceHash; occurrence; fileName; sourceFields: Record<string, number>; netDepositCents };
```

Indexes: `{ "source.kind": 1, txnDate: -1 }` (latest of a kind) and `{ "source.sourceHash": 1 }`.

---

## Account links

- **General ledger**: a CRM account name such as `102.2 - CK PAYMENTS` is linked by the number before `" - "` (`rgAccountIdFromCrmName`) to an `AccountMappingDoc` (`rgAccountId` -> `qboAccountId`, with an optional default Customer or Vendor). Edited on `/account/mapping`.
- **Deposits**: `DepositFieldMappingDoc` (`field` -> `qboAccountId`, with an optional default name). Six fixed fields: `salesAmount`, `refundAmount`, `chargeBackAmount`, `adjustmentAmount`, `fees`, `netDeposit`. Edited in the "Credit card deposit fields" section of `/account/mapping`.
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
| `getLatest` | Last `posted` entry of each kind, plus the DocNumbers of `unknown` or `posting` ones |
| `migrateMappings` | `apply: false` previews, `apply: true` writes |

Entries older than the last posted date are not treated specially: only duplicates are blocked.

### Latest-entry banner

`LatestBanner` shows what to export next. When entries are unconfirmed (`unknown` or stuck `posting`), it warns that the date cannot be fully trusted. Reconcile them with the QBO journal entry reconcile operation. A day that netted to zero stores nothing, so the banner can read as if that day was skipped. Re-uploading it just shows "Nothing to post".

---

## Mapping migration

The old maps (`GlobalSettings.genLedgerAccountMap`, `depositAccountMap`) held QBO account **names**. The **Migrate mappings** tab proposes Id links:

- Matches an account by its name, then by account number (the entry's override, else the number from the CRM name). It never guesses: two matches are reported, not chosen.
- Resolves the default name against active customers (A/R) or vendors (A/P).
- Statuses: `create`, `alreadyMapped` (never overwritten), `unmatched`, `conflict` (two CRM accounts share a number but disagree).
- **Check** writes nothing. **Apply** writes only `create` lines, with `$setOnInsert` so an existing link is never changed.
- The old GlobalSettings maps stay in place, marked LEGACY in `JavelinTypes.ts`. Remove them (and `emptyDepositAccountMap`) once the result is verified.

---

## Page layout

`JavelinPage` shows an "Admins only" alert to non-admins. `JavelinWorkspace` calls `useJavelin({ autoLoad: true })` (the latest entries, `staleTime` 60 s) and renders three tabs. Each flow tab is: `LatestBanner`, a header (**Check entries**, **Post to QuickBooks** with a confirm dialog, **Clear**), a drop zone, then a results area with its own `overflow-y-auto`.

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
| Zero-net days? | Nothing stored. The banner shows the last day that had an entry |
| Who can use it? | Admins only (the API is admin only, so the page is too) |
