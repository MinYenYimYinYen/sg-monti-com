# Javelin

Javelin converts CRM CSV exports into QuickBooks Online (QBO) journal entry import CSVs. It is a client-side transformation pipeline: **upload -> review -> map accounts -> download**. Parsed file data is never persisted. Only the account mappings are saved, in `GlobalSettings`.

The page (`src/app/javelin/page.tsx`) has two tabs, each with its own slice, selectors, header, drop zone and results table:

| Tab | Input | Level it records | Slice |
|---|---|---|---|
| **General Ledger** | One or more CRM General Ledger CSVs, one per day | CRM-level (what happened to customer balances) | `javelinSlice.ts` |
| **Deposits** | One CRM credit card processing deposit CSV | Processor-level (what hit the bank) | `depositSlice.ts` |

The two flows are independent Redux slices and independent CSV exports. They are linked only by the accounting workflow (see [Refund Handling Across Both Flows](#refund-handling-across-both-flows)).

---

## File Map

| File | Purpose |
|---|---|
| `src/app/javelin/page.tsx` | Page shell: `Tabs`, loads GlobalSettings on mount, seeds both slices' account maps |
| `src/app/javelin/JavelinTypes.ts` | All Javelin types (gen ledger and deposit) |
| `src/app/javelin/javelinSlice.ts` / `javelinSelect.ts` | Gen ledger state and selectors |
| `src/app/javelin/depositSlice.ts` / `depositSelect.ts` | Deposit state and selectors (including balance checks) |
| `src/app/javelin/_lib/genLedgerTransform.ts` | Pure fn: files + map + prefix -> QBO CSV. Also `splitZeroNetRows` and `triggerCSVDownload` |
| `src/app/javelin/_lib/genLedgerSanityChecks.ts` | Array of date sanity checks |
| `src/app/javelin/_lib/depositTransform.ts` | Pure fn: rows + map + prefix -> QBO CSV. Also `FIELD_NATURAL_SIDE`, `DEPOSIT_FIELDS` |
| `src/app/csv/generalLedger/genLedgerParser.ts` | `createCSVParser` config for GL CSVs |
| `src/app/csv/deposits/depositParser.ts` | `createCSVParser` config for deposit CSVs |
| `src/app/javelin/_lib/components/` | `JavelinHeader`, `GenLedgerDropZone`, `JavelinResultsTable`, `AccountNumberCell`, `AccountNameCell`, `NameCell`, `DepositHeader`, `DepositDropZone`, `DepositResultsTable` |
| `src/__tests__/javelin/genLedgerTransform.test.ts` | Tests for the gen ledger transform |

Integration points outside this folder:

- `src/app/globalSettings/_lib/` (`GlobalSettingsTypes.ts`, `baseGlobalSettings.ts`, `GlobalSettingsModel.ts`, `globalSettingsSelect.ts`) hold `genLedgerAccountMap` and `depositAccountMap`. `baseGlobalSettings.ts` and `globalSettingsSelect.ts` import `emptyDepositAccountMap` from `depositSlice.ts`.
- `src/store/reducers/index.ts` registers the `javelin` and `deposit` reducers.
- `src/components/dropZone/dropZone.tsx` (`CSVDropzone`) takes `multiple`, with `onFilesDrop` (multiple) or `onFileDrop` (single).

---

## Types (`JavelinTypes.ts`)

```ts
// General Ledger
type GenLedgerRow = { account: string; totalNetAmount: number };
type GenLedgerFile = {
  fileName: string;
  date: string;        // ISO date parsed from the filename; "" if the filename was invalid
  rows: GenLedgerRow[];
  warnings: string[];
  errors: string[];
};
type GenLedgerAccountEntry = {
  qbName: string;
  name?: string;          // QB "Name" column (customer/vendor)
  accountNumber?: string; // auto-parsed from the CRM name, overridable
};
type JavelinState = {
  files: GenLedgerFile[];
  journalNoPrefix: string;
  savedAccountMap: Record<string, GenLedgerAccountEntry>; // mirrors GlobalSettings
  liveAccountMap: Record<string, GenLedgerAccountEntry>;  // staged edits
};

// Deposits
type DepositField =
  | "salesAmount" | "refundAmount" | "chargeBackAmount"
  | "adjustmentAmount" | "fees" | "netDeposit";
type DepositRow = {
  date: string; // ISO yyyy-MM-dd, already adjusted (DepositDate - 1 day)
  salesAmount: number;
  refundAmount: number;
  chargeBackAmount: number;
  adjustmentAmount: number;
  grossDepositAmount: number; // parsed, never output (it is a subtotal)
  fees: number;
  netDeposit: number;
};
type DepositAccountEntry = {
  qbName: string;
  accountNumber?: string; // prepended to qbName in the output CSV
  name?: string;          // QB "Name" column
};
type DepositAccountMap = Record<DepositField, DepositAccountEntry>;
type DepositState = {
  rows: DepositRow[];
  fileName: string;
  warnings: string[];
  errors: string[];
  journalNoPrefix: string;
  savedAccountMap: DepositAccountMap;
  liveAccountMap: DepositAccountMap;
};
```

---

## State

Both slices are synchronous only (no thunks). Saving mappings reuses `globalSettingsActions.updateSettings`. Selectors are exported as `javelinSelect` / `depositSelect`.

### Saved vs live account map

- `savedAccountMap` mirrors what is persisted in GlobalSettings. `liveAccountMap` holds staged edits.
- `initAccountMap(map)` sets both. `page.tsx` calls it in a `useEffect` whenever the matching GlobalSettings map changes.
- `syncSavedAccountMap(map)` sets only `savedAccountMap`. It is called after a successful save to clear the dirty state.
- `hasUnsavedMappingChanges` is `!deepEqual(saved, live, [])`.

### `javelinSlice.ts`

- Initial: `files: []`, `journalNoPrefix` = `SAGL YYMMDD-` from today's date (e.g. `SAGL 260601-`), empty maps.
- Actions: `setFiles`, `setJournalNoPrefix`, `setLiveAccountEntry({ crmName, entry })`, `initAccountMap`, `syncSavedAccountMap`.
- Selectors: `files`, `journalNoPrefix`, `savedAccountMap`, `liveAccountMap`, `hasUnsavedMappingChanges`, `unmappedAccounts`, `allAccountsMapped`.
- `unmappedAccounts`: unique `row.account` values across all files whose `liveAccountMap` entry is missing **or has an empty `qbName`**.

### `depositSlice.ts`

- Initial: `rows: []`, `fileName: ""`, `warnings: []`, `errors: []`, `journalNoPrefix` = `YYMMDD WWDep-` from today's date (e.g. `260603 WWDep-`), maps = `emptyDepositAccountMap` (six fields, each `{ qbName: "" }`).
- Actions: `setRows`, `setFileName`, `setWarnings`, `setErrors`, `setJournalNoPrefix`, `setLiveAccountEntry({ field, entry })`, `initAccountMap`, `syncSavedAccountMap`.
- Selectors: `rows`, `fileName`, `warnings`, `errors`, `journalNoPrefix`, `savedAccountMap`, `liveAccountMap`, `hasUnsavedMappingChanges`, `unmappedFields`, `allAccountsMapped`, `rowBalances`, `outOfBalanceRows`, `allRowsBalanced`.
- `unmappedFields`: only fields that are **non-zero in at least one row** must be mapped, and a field is unmapped when its `qbName` is empty. Fields that are zero in every row are never output, so they need no mapping.
- `rowBalances`: per row `{ rowIndex, date, totalDebits, totalCredits, delta, isBalanced }`, where `isBalanced` is `Math.abs(delta) < 0.001`.

---

## General Ledger Flow

### Upload (`GenLedgerDropZone`)

- Multi-file drop zone (`multiple={true}`).
- Each filename must match `/^\d{4}-\d{2}-\d{2}\.csv$/`. The date in the name becomes the journal date. A bad name produces a `GenLedgerFile` with `date: ""`, no rows and an error. It is shown in the results table and nothing is parsed.
- Sanity checks (`genLedgerSanityChecks.ts`) are `(date: string) => string | null` functions. A non-null result becomes a warning on that file. Current check: the date is not in the current year. To add a check, append to the array.
- Parsing uses `parseGenLedger`. It requires the columns `Account` and `TotalNetAmount` (commas are stripped from amounts). Negative amounts are valid and represent credits.
- **Zero-net rows**: `splitZeroNetRows` removes accounts whose amount rounds to $0.00 in cents, because QBO rejects a line with neither debit nor credit. The removed accounts are listed in a file warning (`Excluded (nets to $0.00): ...`). Removal happens at upload so the table, the unmapped check and the export agree.
- After `setFiles`, the drop zone pre-populates `liveAccountMap`. For each unique account it looks in `{ ...GlobalSettings.genLedgerAccountMap, ...savedAccountMap }`. If an entry with a `qbName` exists, it dispatches `setLiveAccountEntry` with that entry, filling `accountNumber` from the CRM name if missing. Unknown accounts stay unmapped until the user enters a QB name.

### Results (`JavelinResultsTable`)

- Renders nothing when there are no files.
- One accordion item per file. The trigger shows the date and filename, in `text-destructive` if the file has errors, warnings or any unmapped account, otherwise `text-accent`.
- Content shows errors, then warnings, then (when there are no errors and there are rows) a table: **CRM Account | Acct # | QB Account | Name | Debits | Credits**.
- Debit/credit rule: positive `totalNetAmount` is a Debit. Negative is a Credit, shown as the absolute value. Amounts use `<Number isMoney decimals={2}>`.
- Editable cells (each shows text with a pencil button, or an `<Input>` while editing; blur or Enter commits):
  - `AccountNumberCell`: defaults to the text before `" - "` in the CRM name. A blank value clears the override.
  - `AccountNameCell`: the QB account name. It starts in edit mode when empty, and an empty value is not committed.
  - `NameCell`: optional QB Name. A blank value clears it.

### Header (`JavelinHeader`)

- **Journal No Prefix** input (default `SAGL YYMMDD-`). The suffix `01`, `02`... is assigned per file at export. Editable, e.g. for a second session on the same day.
- **Save Account Mappings**: shown only when `hasUnsavedMappingChanges && role === "admin"`. It dispatches `globalSettingsActions.updateSettings({ params: { genLedgerAccountMap: liveAccountMap }, config: { showLoading: false, force: true } })`. On `.unwrap()` success it dispatches `syncSavedAccountMap`.
- **Download QB CSV** (`variant="accent"`): enabled when all accounts are mapped and at least one file has rows. Files with no rows (errors) are filtered out before export. The download is named `qb-journal-entries.csv`.

### Output CSV (`transformToQBJournalCSV`)

One combined CSV for all files. Columns: `*JournalNo`, `*JournalDate`, `*AccountName`, `*Debits`, `*Credits`, `Name`.

| Column | Value |
|---|---|
| `*JournalNo` | `{prefix}{nn}`, e.g. `SAGL 260601-01` |
| `*JournalDate` | File date as `M/D/YYYY` (split from the ISO string, not parsed as a `Date`, to avoid UTC shifts) |
| `*AccountName` | `{accountNumber} {qbName}`, e.g. `102.2 SA Payments:Credit Card Payments`. `accountNumber` is the entry's override, else the text before `" - "` in the CRM name. `qbName` falls back to the CRM name if unmapped. |
| `*Debits` | Amount when positive, else blank |
| `*Credits` | Absolute amount when negative, else blank |
| `Name` | `entry.name`, else blank |

Files with no posting rows are dropped **before** numbering, so journal numbers stay sequential. Amounts are converted through cents to avoid float noise. Optional QBO columns other than `Name` are omitted.

---

## Deposit Flow

### Upload (`DepositDropZone`)

- Single-file drop zone (`multiple={false}`) with no filename restriction.
- Parsing uses `parseDeposit`. Required CSV columns: `DepositDate`, `SalesAmount`, `RefundAmount`, `ChargebackAmount`, `AdjustmentAmount`, `GrossDepositAmount`, `Fees`, `NetDepositAmount`. Amounts have commas stripped.
- `DepositDate` is in the CRM format (e.g. `6/2/2026  11:17:00 AM`). It is parsed, formatted as `yyyy-MM-dd`, then **reduced by 1 day** with `dateStrings.subDays`. Deposits clear the next business day, so the shift keeps the queued deposit account at zero each day in QBO.
- On failure it dispatches empty rows, the filename, the errors and empty warnings. On success it dispatches rows, filename, no errors and any parser warnings. The drop zone does no per-account seeding. The account map has fixed keys and is seeded by `page.tsx`.

### Debit/credit convention

Each field has a natural side, used when its value is positive. A negative value flips the side and uses `Math.abs(value)`. Zero values are excluded entirely.

| Field | Natural side |
|---|---|
| `salesAmount` | Credit |
| `refundAmount` | Debit |
| `chargeBackAmount` | Debit |
| `adjustmentAmount` | Debit (negative flips to Credit) |
| `fees` | Debit |
| `netDeposit` | Debit |

`GrossDepositAmount` is parsed but never output.

`FIELD_NATURAL_SIDE` is defined in both `depositTransform.ts` (exported, used by the table and the CSV) and `depositSelect.ts` (private, used for balance). Keep them in sync if either changes.

### Balance validation

`computeRowBalance` in `depositSelect.ts` checks that debits equal credits for each row. It is a guard against parsing or config mistakes. It does **not** judge whether a line sits on the semantically right side. Warnings are shown inline, not as toasts.

### Results (`DepositResultsTable`)

- Renders nothing when there are no rows and no errors. When there are errors, only the error list is shown.
- Warnings are listed above the accordion. There is one accordion item per input row.
- Trigger summary: `[date]  Sales  Refunds  Chargebacks  Fees  Net Deposit`. Zero amounts are omitted from the summary. The text is `text-accent` when the row is balanced and every non-zero field has a QB name, otherwise `text-destructive`.
- Content, when out of balance: a destructive panel with total debits, total credits and the delta, plus a "contact admin" note.
- Content table: **Field | Acct # | QB Account | Name | Debits | Credits**, one row per non-zero field. The three editable cells follow the same pencil/input pattern as the gen ledger cells. They are local components inside the file: `DepositAccountNumberCell`, `DepositAccountNameCell`, `DepositNameCell`. They dispatch `depositActions.setLiveAccountEntry({ field, entry })`.

### Header (`DepositHeader`)

- **Journal No Prefix** (default `YYMMDD WWDep-`). The suffix is assigned per row at export.
- **Save Account Mappings**: admin-only, shown when `hasUnsavedMappingChanges`. It saves `liveAccountMap` to `GlobalSettings.depositAccountMap` (`force: true`), then calls `syncSavedAccountMap`.
- **Download QB CSV**: disabled when `!allAccountsMapped || rows.length === 0`. The variant is `destructive` when any row is out of balance, otherwise `accent`. A download is still allowed when unbalanced so the CSV can be inspected. The file is `qb-deposit-entries.csv`.

### Output CSV (`transformToDepositCSV`)

One combined CSV. Each input row becomes one multi-line journal entry, with one output line per non-zero field. Columns: `*JournalNo`, `*JournalDate`, `*AccountName`, `*Debits`, `*Credits`, `Description`, `Name`.

| Column | Value |
|---|---|
| `*JournalNo` | `{prefix}{nn}` by CSV row order, e.g. `260603 WWDep-01` |
| `*JournalDate` | Adjusted date as `M/D/YYYY` |
| `*AccountName` | `{accountNumber} {qbName}` if `accountNumber` is set, otherwise just `qbName` (unlike the GL flow, no number is auto-derived) |
| `*Debits` / `*Credits` | Absolute amount on the effective side, other column blank |
| `Description` | `Refund`, `Chargeback` or `Adjustment` for those fields, else blank. It disambiguates lines that share a QB account. |
| `Name` | `entry.name`, else blank |

---

## Refund Handling Across Both Flows

### For users

A deposit entry has up to four lines:

| Field | Side | Example account | Why |
|---|---|---|---|
| Sales Amount | Credit | SA Payments:Credit Card Payments | Money collected from customers |
| Refund Amount | Debit | SA Payments:Credit Card Payments | Reverses sales in the same account |
| Fees | Debit | Expenses - Administrative:Bank Services | Processing cost |
| Net Deposit | Debit | SSB Checking | Cash that hit the bank |

**Map Refund Amount to the same Credit Card Payments account as Sales Amount.** A refund is money the processor clawed back from the deposit, so it never reached the bank. It reduces the Credit Card Payments balance that sales flow into. **Do not map Refund Amount to Accounts Receivable in the deposit flow.** The CRM's General Ledger export handles A/R.

The full refund spans both flows:

```
Step 1 - Deposit flow (processor side)
Credit  Credit Card Payments   $466.98   <- Sales Amount
Debit   Credit Card Payments   $466.98   <- Refund Amount (nets to zero in this account)
Debit   Fees                   $126.20
Debit   SSB Checking           $3,699.11

Step 2 - Gen Ledger flow (CRM side)
Debit   Accounts Receivable    $466.98   <- customer owes again / credit balance cleared
Credit  Credit Card Payments   $466.98   <- processor-side liability reduced
```

- **Scenario A, the customer had a credit balance (overpayment):** the A/R debit offsets that balance. No further action is needed.
- **Scenario B, the customer is getting a write-off:** the CRM records a separate adjustment that flows through the GL export:
  ```
  Credit  Accounts Receivable    $466.98   <- clears the Step 2 balance
  Debit   Adjustments            $466.98   <- records the loss
  ```

### For developers

`refundAmount: "debit"` in `FIELD_NATURAL_SIDE` is **intentional**. Mapping refunds to A/R in the deposit flow would double-hit A/R, because the GL flow already debits it when the CRM records the refund. The deposit flow records the processor-level transaction. The GL flow records the CRM-level one. They must use different accounts for the refund line.

| Account | Deposit flow | Gen Ledger flow |
|---|---|---|
| Credit Card Payments | credit sales, debit refund | credit (refund offset) |
| Accounts Receivable | none | debit |
| SSB Checking | debit net deposit | none |
| Fees | debit | none |

Balance example: credits `Sales $4,292.29`; debits `Refund $466.98 + Fees $126.20 + Net Deposit $3,699.11 = $4,292.29`.

---

## Page Layout (`page.tsx`)

```
JavelinPage  (flex flex-col h-full; the h1 and TabsList are shrink-0)
+-- Tabs defaultValue="genLedger"
    +-- TabsContent "genLedger"
    |   +-- JavelinHeader
    |   +-- Accordion "Upload General Ledger CSVs" (open by default) -> GenLedgerDropZone
    |   +-- div.flex-1.min-h-0.overflow-y-auto -> JavelinResultsTable
    +-- TabsContent "deposits"
        +-- DepositHeader
        +-- DepositDropZone
        +-- div.flex-1.min-h-0.overflow-y-auto -> DepositResultsTable
```

On mount the page dispatches `globalSettingsActions.getSettings` (`showLoading: false`). Two effects then seed the slices from `globalSettingsSelect.genLedgerAccountMap` and `globalSettingsSelect.depositAccountMap`. Results containers carry their own `overflow-y-auto` to satisfy the page scroll convention.

---

## Account Mapping Storage

- `GlobalSettings.genLedgerAccountMap: Record<string, GenLedgerAccountEntry>` (CRM account name -> entry).
- `GlobalSettings.depositAccountMap: DepositAccountMap` (fixed six keys).
- No Javelin-specific API route exists. Loading and saving use `globalSettingsActions.getSettings` and `updateSettings`.
- Only admins see the save button. Non-admins can still edit `liveAccountMap` for the current session and download.

---

## Design Decisions

| Question | Decision |
|---|---|
| Persist parsed data? | No. Transform only. |
| One output CSV or one per file/row? | One combined CSV per flow. |
| Shared or separate slices? | Separate, because the state shapes differ. |
| Shared account map in GlobalSettings? | No. `genLedgerAccountMap` and `depositAccountMap` are separate fields. |
| GL journal date source? | Filename (`YYYY-MM-DD.csv`), rejected at upload if invalid. |
| Deposit filename restriction? | None. |
| Balance validation presentation? | Selector-derived and inline, not toasts. |
| Download blocked when a deposit is out of balance? | No. The button turns destructive as a warning. |
| Zero-value lines? | Excluded from display, mapping requirements and output in both flows. |
