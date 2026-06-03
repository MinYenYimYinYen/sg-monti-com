# Javelin — Deposit Transform Implementation

All tasks are AI-owned. Steps are sequenced so you can review each conceptual unit before the next
begins. Signal readiness to proceed with: **"Proceed to Step N"** or **"Check my work on Step N"**
if you've made manual edits.

---

## Step 1 — Type & Data Foundation

**Files touched:**
- `src/app/javelin/JavelinTypes.ts` *(modify)*
- `src/app/javelin/depositSlice.ts` *(new)*
- `src/app/javelin/depositSelect.ts` *(new)*
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` *(modify)*
- `src/app/globalSettings/_lib/baseGlobalSettings.ts` *(modify)*
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts` *(modify)*
- `src/app/globalSettings/_lib/globalSettingsSelect.ts` *(modify)*
- `src/store/reducers/index.ts` *(modify)*

**What this step delivers:** The complete data layer. All selectors are live and the store is
registered. Steps 2–5 can import from these files without any stubs.

### `JavelinTypes.ts` additions

```typescript
/** The 6 deposit fields that appear as journal entry lines (GrossDepositAmount excluded). */
export type DepositField =
  | "salesAmount"
  | "refundAmount"
  | "chargeBackAmount"
  | "adjustmentAmount"
  | "fees"
  | "netDeposit";

/** One parsed row from the deposit CSV. Date is already adjusted (DepositDate − 1 day). */
export type DepositRow = {
  date: string;               // ISO yyyy-MM-dd
  salesAmount: number;
  refundAmount: number;
  chargeBackAmount: number;
  adjustmentAmount: number;
  grossDepositAmount: number; // parsed but never output — it's a subtotal
  fees: number;
  netDeposit: number;
};

/** QB account name per deposit field. One string per field — no accountNumber/name needed. */
export type DepositAccountMap = Record<DepositField, string>;

export type DepositState = {
  rows: DepositRow[];
  fileName: string;
  warnings: string[];
  errors: string[];
  journalNoPrefix: string;
  savedAccountMap: DepositAccountMap;
  liveAccountMap: DepositAccountMap;
};
```

### `depositSlice.ts`

Default prefix helper: `YYDDMM WWDep-` — same pattern as `buildDefaultPrefix()` in
`javelinSlice.ts` but with `WWDep` instead of `SAGL`.

```typescript
function buildDepositPrefix(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd} WWDep-`;
}
```

Empty account map constant (used for `initialState` and `baseGlobalSettings`):
```typescript
const emptyDepositAccountMap: DepositAccountMap = {
  salesAmount: "",
  refundAmount: "",
  chargeBackAmount: "",
  adjustmentAmount: "",
  fees: "",
  netDeposit: "",
};
```

Actions (all synchronous reducers):
- `setRows(state, action: PayloadAction<DepositRow[]>)` — replaces `state.rows`
- `setFileName(state, action: PayloadAction<string>)` — replaces `state.fileName`
- `setWarnings(state, action: PayloadAction<string[]>)` — replaces `state.warnings`
- `setErrors(state, action: PayloadAction<string[]>)` — replaces `state.errors`
- `setJournalNoPrefix(state, action: PayloadAction<string>)` — replaces `state.journalNoPrefix`
- `setLiveAccountEntry(state, action: PayloadAction<{ field: DepositField; qbName: string }>)` —
  sets `state.liveAccountMap[field] = qbName`
- `initAccountMap(state, action: PayloadAction<DepositAccountMap>)` — sets both
  `savedAccountMap` and `liveAccountMap` to the payload
- `syncSavedAccountMap(state, action: PayloadAction<DepositAccountMap>)` — sets
  `savedAccountMap` to the payload (called after a successful GlobalSettings save)

Export as `depositActions` and `depositReducer` (default export).

### `depositSelect.ts`

**Balance computation constants** (defined at module level, not inside selectors):
```typescript
// Natural side for each field when value is positive.
// "credit" means the value goes in the Credits column; "debit" means Debits.
const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};

const DEPOSIT_FIELDS: DepositField[] = [
  "salesAmount", "refundAmount", "chargeBackAmount",
  "adjustmentAmount", "fees", "netDeposit",
];
```

Selectors:
- `selectDepositState` — `state.deposit`
- `selectRows` — `state.deposit.rows`
- `selectFileName` — `state.deposit.fileName`
- `selectWarnings` — `state.deposit.warnings`
- `selectErrors` — `state.deposit.errors`
- `selectJournalNoPrefix` — `state.deposit.journalNoPrefix`
- `selectSavedAccountMap` — `state.deposit.savedAccountMap`
- `selectLiveAccountMap` — `state.deposit.liveAccountMap`
- `selectHasUnsavedMappingChanges` — `!deepEqual(saved, live, [])`
- `selectUnmappedFields` — `DEPOSIT_FIELDS.filter(f => !liveAccountMap[f])`
- `selectAllAccountsMapped` — `unmappedFields.length === 0`
- `selectRowBalances` — `createSelector` over `[selectRows]`; for each row, iterate
  `DEPOSIT_FIELDS`, skip zero values, compute effective side (flip if value negative), accumulate
  `totalDebits` and `totalCredits`; return array of
  `{ rowIndex, date, totalDebits, totalCredits, delta: totalDebits - totalCredits, isBalanced: Math.abs(delta) < 0.001 }`
- `selectOutOfBalanceRows` — filtered from `selectRowBalances` where `!isBalanced`
- `selectAllRowsBalanced` — `outOfBalanceRows.length === 0`

Export as `depositSelect` object.

### GlobalSettings additions
- **Types**: add `depositAccountMap: DepositAccountMap` to `GlobalSettings`
- **Base**: add `depositAccountMap: emptyDepositAccountMap` to `baseGlobalSettings`
  (import `DepositAccountMap` from `JavelinTypes` and define the empty map inline)
- **Model**: add `depositAccountMap: { type: Object, required: true, default: {} }` to the
  Mongoose schema
- **Select**: add `selectDepositAccountMap` selector; export on `globalSettingsSelect` object

### Store registration
Add to `src/store/reducers/index.ts`:
```typescript
import depositReducer from "@/app/javelin/depositSlice";
// in combineReducers:
deposit: depositReducer,
```

---

## Step 2 — Parsing Layer

**Files touched:**
- `src/app/csv/deposits/depositParser.ts` *(new)*

**What this step delivers:** The CSV parser for deposit files. The drop zone component (Step 3)
imports directly from this file.

### `depositParser.ts`

Uses `createCSVParser<DepositRow>` from `@/app/csv/_lib/parserFactory`.

Date transformation — parse the CRM date format (`"6/2/2026  11:17:00 AM"`) and subtract 1 day:
```typescript
import { format } from "date-fns";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

function parseDepositDate(val: string): string {
  const parsed = new Date(val.trim());
  const iso = format(parsed, "yyyy-MM-dd");
  return dateStrings.subDays(iso, 1);
}
```

Amount transformation (strip commas, parse float):
```typescript
const parseAmount = (val: string) => parseFloat(val.replace(/,/g, ""));
```

Config:
```typescript
const DEPOSIT_PARSE_CONFIG: ParseConfig<DepositRow> = {
  columnMappings: {
    DepositDate: "date",
    SalesAmount: "salesAmount",
    RefundAmount: "refundAmount",
    ChargeBackAmount: "chargeBackAmount",
    AdjustmentAmount: "adjustmentAmount",
    GrossDepositAmount: "grossDepositAmount",
    Fees: "fees",
    NetDeposit: "netDeposit",
  },
  requiredColumns: [
    "DepositDate", "SalesAmount", "RefundAmount", "ChargeBackAmount",
    "AdjustmentAmount", "GrossDepositAmount", "Fees", "NetDeposit",
  ],
  optionalColumns: [],
  transformations: {
    DepositDate: parseDepositDate,
    SalesAmount: parseAmount,
    RefundAmount: parseAmount,
    ChargeBackAmount: parseAmount,
    AdjustmentAmount: parseAmount,
    GrossDepositAmount: parseAmount,
    Fees: parseAmount,
    NetDeposit: parseAmount,
  },
  schema: DepositRowSchema, // z.object with date: z.string(), all amounts: z.number()
};

export const parseDeposit = createCSVParser<DepositRow>(DEPOSIT_PARSE_CONFIG);
```

Zod schema: `date` is `z.string().min(1)`, all amount fields are `z.number()`.

---

## Step 3 — Transform & Export

**Files touched:**
- `src/app/javelin/_lib/depositTransform.ts` *(new)*

**What this step delivers:** The pure function that produces the downloadable CSV string.

### `depositTransform.ts`

```typescript
// Natural side for each field when value is positive
const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};

const DEPOSIT_FIELDS: DepositField[] = [
  "salesAmount", "refundAmount", "chargeBackAmount",
  "adjustmentAmount", "fees", "netDeposit",
];
```

`transformToDepositCSV(rows, accountMap, journalNoPrefix)`:
- For each `DepositRow` (in order):
  - `JournalNo = journalNoPrefix + String(index + 1).padStart(2, "0")`
  - `JournalDate = formatQBDate(row.date)` — `M/D/YYYY` format (reuse the same helper as
    `genLedgerTransform.ts`, or extract to a shared util)
  - For each field in `DEPOSIT_FIELDS`:
    - Skip if `row[field] === 0`
    - `naturalSide = FIELD_NATURAL_SIDE[field]`
    - If `row[field] > 0`: effective side = naturalSide
    - If `row[field] < 0`: effective side = flip(naturalSide), value = `Math.abs(row[field])`
    - `Debits = effectiveSide === "debit" ? value : ""`
    - `Credits = effectiveSide === "credit" ? value : ""`
    - Push `{ "*JournalNo": journalNo, "*JournalDate": journalDate, "*AccountName": accountMap[field], "*Debits": debits, "*Credits": credits }`
- Use `Papa.unparse` with columns `["*JournalNo", "*JournalDate", "*AccountName", "*Debits", "*Credits"]`

Also re-export `triggerCSVDownload` from `genLedgerTransform.ts` (or import it directly in the
header component — no need to duplicate).

---

## Step 4 — Drop Zone Component

**Files touched:**
- `src/app/javelin/_lib/components/DepositDropZone.tsx` *(new)*

**What this step delivers:** The upload entry point for deposit CSVs.

### `DepositDropZone.tsx`

Reads: `depositSelect.savedAccountMap` (to pre-populate `liveAccountMap` for known fields).
Dispatches: `depositActions.setRows`, `depositActions.setFileName`,
`depositActions.setWarnings`, `depositActions.setErrors`.

On file drop (receives single `File` from `CSVDropzone`):
1. Call `parseDeposit(file)` — await the result.
2. If parse fails:
   - Dispatch `setRows([])`, `setFileName(file.name)`, `setErrors(result.errors)`, `setWarnings([])`
3. If parse succeeds:
   - Dispatch `setRows(result.data)`, `setFileName(file.name)`,
     `setErrors([])`, `setWarnings(result.warnings ?? [])`

No per-account seeding needed here — the account map is fixed (6 fields), and `initAccountMap`
is called on page mount from GlobalSettings. The drop zone only handles file parsing.

Layout: wraps `<CSVDropzone multiple={false} onFileDrop={handleFileDrop} />`.

---

## Step 5 — Results Table

**Files touched:**
- `src/app/javelin/_lib/components/DepositResultsTable.tsx` *(new)*

**What this step delivers:** The review UI for deposit rows.

### `DepositResultsTable.tsx`

Reads: `depositSelect.rows`, `depositSelect.liveAccountMap`, `depositSelect.rowBalances`,
`depositSelect.errors`, `depositSelect.warnings`, `depositSelect.fileName`
Dispatches: `depositActions.setLiveAccountEntry`

If `rows.length === 0` and `errors.length === 0`: render nothing.

If `errors.length > 0`: render a top-level error list (destructive text color).

If `warnings.length > 0`: render a top-level warning list above the accordion.

**Accordion** (one item per row):

Trigger content (single line):
```
{row.date}  Sales: ${salesAmount}  Refunds: ${refundAmount}  Chargebacks: ${chargeBackAmount}  Fees: ${fees}  Net Deposit: ${netDeposit}
```
- Use `<Number isMoney decimals={2}>` for each amount in the summary
- Trigger color class: `text-accent` if `rowBalance.isBalanced`, `text-destructive` if not

Accordion content:
1. If `!rowBalance.isBalanced`:
   ```
   ⚠ Journal does not balance.
   Total Debits: $X  |  Total Credits: $Y  |  Delta: $Z
   Please contact admin with this information.
   ```
   Styled: `bg-destructive/10 text-destructive rounded p-3 mb-3`

2. Table — columns: **Field** | **QB Account** | **Debits** | **Credits**
   - Iterate `DEPOSIT_FIELDS` (imported from `depositTransform.ts` or a shared constant)
   - Skip rows where `row[field] === 0`
   - **Field**: human-readable label (e.g. `"Sales Amount"`, `"Fees"`, `"Net Deposit"`)
   - **QB Account**: if `liveAccountMap[field]` is non-empty → plain text + pencil edit button
     (same pattern as `AccountNameCell`); if empty → `<Input>` that dispatches
     `setLiveAccountEntry({ field, qbName: trimmed })` on blur/Enter
   - **Debits / Credits**: compute effective side using `FIELD_NATURAL_SIDE` + sign logic;
     render `<Number isMoney decimals={2}>` in the appropriate column

Human-readable field labels (define as a constant):
```typescript
const FIELD_LABELS: Record<DepositField, string> = {
  salesAmount: "Sales Amount",
  refundAmount: "Refund Amount",
  chargeBackAmount: "Chargeback Amount",
  adjustmentAmount: "Adjustment Amount",
  fees: "Fees",
  netDeposit: "Net Deposit",
};
```

---

## Step 6 — Header & Page Shell

**Files touched:**
- `src/app/javelin/_lib/components/DepositHeader.tsx` *(new)*
- `src/app/javelin/page.tsx` *(modify)*

**What this step delivers:** The complete, wired-up deposit tab. Feature is fully functional after
this step.

### `DepositHeader.tsx`

Reads:
- `depositSelect.journalNoPrefix`
- `depositSelect.hasUnsavedMappingChanges`
- `depositSelect.liveAccountMap`
- `depositSelect.allAccountsMapped`
- `depositSelect.rows`
- `depositSelect.allRowsBalanced`
- `authSelect.role`

Dispatches:
- `depositActions.setJournalNoPrefix`
- `depositActions.syncSavedAccountMap`
- `globalSettingsActions.updateSettings`

Layout: horizontal flex row (same pattern as `JavelinHeader`):
1. `<Input>` labeled "Journal No Prefix" — value from `journalNoPrefix`
2. **Save Account Mappings** `<Button variant="primary" intensity="solid">` — rendered only when
   `hasUnsavedMappingChanges && role === "admin"`. On click:
   - Dispatch `globalSettingsActions.updateSettings({ params: { depositAccountMap: liveAccountMap }, config: { showLoading: false, force: true } })`
   - On `.unwrap()` success, dispatch `syncSavedAccountMap(liveAccountMap)`
3. **Download QB CSV** `<Button>` — disabled when `!allAccountsMapped || rows.length === 0`.
   - `variant="destructive" intensity="solid"` when `!allRowsBalanced` (out-of-balance warning)
   - `variant="accent" intensity="solid"` when balanced
   - On click: call `transformToDepositCSV(rows, liveAccountMap, journalNoPrefix)`, then
     `triggerCSVDownload(csvString, "qb-deposit-entries.csv")`

### `page.tsx` modifications

Add `Tabs` wrapper around the existing content. The existing `JavelinHeader`, accordion drop zone,
and `JavelinResultsTable` move into `TabsContent value="genLedger"`.

Add a second `useEffect` to seed the deposit slice:
```typescript
const depositAccountMap = useSelector(globalSettingsSelect.depositAccountMap);

useEffect(() => {
  dispatch(depositActions.initAccountMap(depositAccountMap));
}, [dispatch, depositAccountMap]);
```

Full layout:
```tsx
<Tabs defaultValue="genLedger">
  <TabsList>
    <TabsTrigger value="genLedger">General Ledger</TabsTrigger>
    <TabsTrigger value="deposits">Deposits</TabsTrigger>
  </TabsList>

  <TabsContent value="genLedger">
    <JavelinHeader />
    <Accordion type="single" collapsible defaultValue="upload" className="shrink-0">
      <AccordionItem value="upload">
        <AccordionTrigger>Upload General Ledger CSVs</AccordionTrigger>
        <AccordionContent>
          <GenLedgerDropZone />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <div className="flex-1 min-h-0 overflow-y-auto">
      <JavelinResultsTable />
    </div>
  </TabsContent>

  <TabsContent value="deposits">
    <DepositHeader />
    <DepositDropZone />
    <div className="flex-1 min-h-0 overflow-y-auto">
      <DepositResultsTable />
    </div>
  </TabsContent>
</Tabs>
```

---

## Task Status Table

| Step | Description | Status | Depends On |
|---|---|---|---|
| 1 | Type & Data Foundation (types, slice, selectors, GlobalSettings, store) | ⬜ Pending | — |
| 2 | Parsing Layer (`depositParser.ts`) | ⬜ Pending | Step 1 |
| 3 | Transform & Export (`depositTransform.ts`) | ⬜ Pending | Step 1 |
| 4 | Drop Zone Component (`DepositDropZone`) | ⬜ Pending | Steps 1, 2 |
| 5 | Results Table (`DepositResultsTable`) | ⬜ Pending | Steps 1, 3 |
| 6 | Header & Page Shell (`DepositHeader`, `page.tsx`) | ⬜ Pending | Steps 1, 3, 4, 5 |
