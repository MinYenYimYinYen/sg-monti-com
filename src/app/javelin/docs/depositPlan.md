# Javelin — Deposit Transform Plan

## What We're Building

A second transform pipeline within the Javelin feature. Input is a CSV export from the CRM's
credit card processing system representing bank deposits. Output is a QuickBooks Online journal
entry import CSV — the same format as the General Ledger transform.

The Javelin page gains a `Tabs` layout: **General Ledger** (existing) and **Deposits** (new).

---

## Desired Behaviors & UX

### Upload
- User drops a single CSV file onto the deposit drop zone.
- No filename restriction — the CRM can name the file anything.
- The `DepositDate` column is parsed from the CSV and adjusted: **subtract 1 day** from the
  deposit date. This aligns QBO data with the CRM day-by-day (deposits clear the next business
  day; subtracting one day keeps the queued deposit account at zero each day).
- Date is stored as an ISO string (`yyyy-MM-dd`) using `dateStrings.subDays`.

### Results Table
- After upload, results appear in an accordion — one item per input row (one per deposit event).
- **Accordion trigger** (single summary line):
  - Shows: `[date]  Sales: $X  Refunds: $X  Chargebacks: $X  Fees: $X  Net Deposit: $X`
  - Color: `text-accent` if the journal entry balances, `text-destructive` if it does not.
- **Inside the accordion content:**
  - If the journal entry is out of balance: render an inline warning panel showing total debits,
    total credits, and the delta. Styled with destructive colors.
  - Table columns: **Field** | **QB Account** | **Debits** | **Credits**
  - Zero-value fields are excluded from the table entirely.
  - QB Account cell: plain text if mapped, `<Input>` if not (same inline-edit pattern as
    `AccountNameCell` in the gen ledger workflow).

### Header Controls
- **Journal No Prefix** input: pre-filled with `YYDDMM WWDep-` (e.g. `260603 WWDep-`).
  Editable. Suffix (`01`, `02`…) is auto-assigned per row during export.
- **Save Account Mappings** button: admin-only, shown when `hasUnsavedMappingChanges`. Saves
  `liveAccountMap` to `GlobalSettings.depositAccountMap`.
- **Download QB CSV** button: disabled when any field is unmapped or no rows are loaded.
  When out-of-balance rows exist, the button renders with `variant="destructive"` as a visual
  warning — download is still allowed so the user can inspect the CSV to debug.

---

## Input CSV Columns

| Column | Used? | Notes |
|---|---|---|
| `DepositDate` | ✓ | Parsed, adjusted (−1 day), stored as ISO string |
| `SalesAmount` | ✓ | Always positive in raw CSV |
| `RefundAmount` | ✓ | Always positive in raw CSV |
| `ChargeBackAmount` | ✓ | Always positive in raw CSV |
| `AdjustmentAmount` | ✓ | May be positive or negative |
| `GrossDepositAmount` | parsed, not output | Subtotal — excluded from journal entry |
| `Fees` | ✓ | Always positive in raw CSV |
| `NetDeposit` | ✓ | Always positive in raw CSV |

---

## Debit/Credit Convention

Each field has a "natural side" — the side it goes on when its value is positive.
If a value is negative, the side flips and `Math.abs(value)` is used.

| Field | Natural Side | Rationale |
|---|---|---|
| `salesAmount` | **Credit** | Revenue earned |
| `refundAmount` | **Debit** | Revenue reversal |
| `chargeBackAmount` | **Debit** | Revenue reversal |
| `adjustmentAmount` | **Debit** | Positive = additional charge; negative flips to Credit |
| `fees` | **Debit** | Fee expense |
| `netDeposit` | **Debit** | Cash to bank account |

---

## Balance Validation

A correctly configured journal entry must have equal total debits and total credits.
Because the debit/credit sides are hard-coded, a misconfiguration would produce an unbalanced
entry. Balance is checked per row via a selector (`depositSelect.rowBalances`).

- `selectRowBalances` — computes `{ totalDebits, totalCredits, delta, isBalanced }` per row
- `selectOutOfBalanceRows` — filtered to `isBalanced === false`
- `selectAllRowsBalanced` — `true` when no out-of-balance rows exist

Balance warnings are shown inline in the accordion (not as toasts).

---

## Output CSV Format

Same format as the General Ledger output — QB Online journal entry import:

| Column | Value |
|---|---|
| `*JournalNo` | `{prefix}{nn}` e.g. `260603 WWDep-01` |
| `*JournalDate` | Adjusted date formatted as `M/D/YYYY` |
| `*AccountName` | QB account name from `liveAccountMap[field]` |
| `*Debits` | Amount if effective side is Debit, else blank |
| `*Credits` | Amount if effective side is Credit, else blank |

One input row → one multi-line journal entry (one output row per non-zero field).
Rows are processed in CSV order; each gets the next sequential suffix (`01`, `02`…).

---

## Account Mapping

- Stored in `GlobalSettings.depositAccountMap: DepositAccountMap`
- `DepositAccountMap = Record<DepositField, string>` — a fixed 6-key record (one QB account name
  per deposit field). Simpler than `GenLedgerAccountEntry` — no `accountNumber` or `name` needed.
- Loaded on page mount via `globalSettingsActions.getSettings`.
- Saved via `globalSettingsActions.updateSettings`.
- No new API route needed.

---

## State Management

### New slice: `depositSlice.ts`

State shape (`DepositState` in `JavelinTypes.ts`):
```typescript
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

Actions:
- `setRows(DepositRow[])` — replaces parsed rows after upload
- `setFileName(string)` — stores the uploaded filename
- `setWarnings(string[])` — parse warnings
- `setErrors(string[])` — parse errors
- `setJournalNoPrefix(string)` — user edits the prefix input
- `setLiveAccountEntry({ field: DepositField; qbName: string })` — user types a QB name
- `initAccountMap(DepositAccountMap)` — seeds both `savedAccountMap` and `liveAccountMap`
- `syncSavedAccountMap(DepositAccountMap)` — called after a successful save

### New selectors: `depositSelect.ts`
- `rows`, `fileName`, `warnings`, `errors`, `journalNoPrefix`
- `savedAccountMap`, `liveAccountMap`
- `hasUnsavedMappingChanges` — `!deepEqual(saved, live)`
- `unmappedFields` — `DepositField[]` where `liveAccountMap[field]` is empty
- `allAccountsMapped` — `unmappedFields.length === 0`
- `rowBalances` — per-row `{ rowIndex, date, totalDebits, totalCredits, delta, isBalanced }`
- `outOfBalanceRows` — filtered to `isBalanced === false`
- `allRowsBalanced` — `outOfBalanceRows.length === 0`

---

## Component Tree

```
page.tsx (javelin)
└── Tabs
    ├── TabsContent "genLedger"  (existing — unchanged)
    └── TabsContent "deposits"
        ├── DepositHeader
        │   ├── <Input> Journal No Prefix
        │   ├── <Button> Save Account Mappings  (conditional: admin + hasUnsavedMappingChanges)
        │   └── <Button> Download QB CSV        (disabled: !allMapped || no rows;
        │                                        destructive variant: !allRowsBalanced)
        ├── DepositDropZone
        │   └── CSVDropzone (multiple={false})
        └── DepositResultsTable
            └── [per row — Accordion]
                ├── Trigger: date + summary amounts (accent | destructive)
                └── Content
                    ├── [if out of balance] Balance warning panel
                    └── Table
                        └── [per non-zero field]
                            ├── Field label
                            ├── QB Account (text if mapped | <Input> if not)
                            ├── Debits
                            └── Credits
```

---

## New Files Summary

| File | Purpose |
|---|---|
| `src/app/javelin/depositSlice.ts` | Redux slice — rows, prefix, account map (saved + live) |
| `src/app/javelin/depositSelect.ts` | Selectors including balance checks and unmapped fields |
| `src/app/csv/deposits/depositParser.ts` | `createCSVParser` config for deposit input CSVs |
| `src/app/javelin/_lib/depositTransform.ts` | Pure fn: rows + map + prefix → QB CSV string |
| `src/app/javelin/_lib/components/DepositDropZone.tsx` | Single-file drop zone with parse dispatch |
| `src/app/javelin/_lib/components/DepositResultsTable.tsx` | Per-row accordion with inline mapping |
| `src/app/javelin/_lib/components/DepositHeader.tsx` | Prefix input + Save Mappings + Download |

### Modified Files

| File | Change |
|---|---|
| `src/app/javelin/JavelinTypes.ts` | Add `DepositField`, `DepositRow`, `DepositAccountMap`, `DepositState` |
| `src/app/javelin/page.tsx` | Add `Tabs` wrapper; seed deposit slice from GlobalSettings |
| `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` | Add `depositAccountMap: DepositAccountMap` |
| `src/app/globalSettings/_lib/baseGlobalSettings.ts` | Add default empty `depositAccountMap` |
| `src/app/globalSettings/_lib/GlobalSettingsModel.ts` | Add `depositAccountMap` schema field |
| `src/app/globalSettings/_lib/globalSettingsSelect.ts` | Add `depositAccountMap` selector |
| `src/store/reducers/index.ts` | Register `depositReducer` |

---

## Open Questions / Decisions Made

| Question | Decision |
|---|---|
| Separate or shared slice with gen ledger? | Separate — different state shapes |
| Mingle `depositAccountMap` with `genLedgerAccountMap` in GlobalSettings? | No — separate fields |
| Filename restriction on deposit CSV? | None — any filename accepted |
| GrossDepositAmount in output? | No — it's a subtotal, excluded |
| Zero-value fields in output? | Excluded from display and output |
| Balance validation approach? | Selector-derived; shown inline in accordion, not as toast |
| Download blocked when out of balance? | No — allowed, but button turns destructive as warning |
| Journal No Prefix format? | `YYDDMM WWDep-` (e.g. `260603 WWDep-`) |
| One output CSV or one per row? | One combined CSV |
