# Javelin — Phase 2 Implementation

All tasks are AI-owned. Steps are sequenced so you can review each conceptual unit before the next
begins. Signal readiness to proceed with: **"Proceed to Step N"** or **"Check my work on Step N"**
if you've made manual edits.

---

## Step 1 — Data Foundation

**Files touched:**
- `src/app/javelin/JavelinTypes.ts` *(new)*
- `src/app/javelin/javelinSlice.ts` *(new)*
- `src/app/javelin/javelinSelect.ts` *(new)*
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` *(modify)*
- `src/app/globalSettings/_lib/baseGlobalSettings.ts` *(modify)*
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts` *(modify)*
- `src/app/globalSettings/_lib/globalSettingsSelect.ts` *(modify)*
- `src/store/reducers/index.ts` *(modify)*

**What this step delivers:** The complete data layer. All selectors are live and the store is
registered. Steps 2–6 can import from these files without any stubs.

### `JavelinTypes.ts`
Three types:
- `GenLedgerRow` — `{ account: string; totalNetAmount: number }`
- `GenLedgerFile` — `{ fileName, date, rows, warnings, errors }` where `date` is an ISO string
  parsed from the filename and `warnings`/`errors` are string arrays
- `JavelinState` — `{ files, journalNoPrefix, savedAccountMap, liveAccountMap }`

### `javelinSlice.ts`
Initial state:
- `files: []`
- `journalNoPrefix`: computed from today's date as `SAGL YYMMDD-` (e.g. `"SAGL 260601-"`)
  — use a helper that formats `new Date()` to 2-digit year + zero-padded month + day
- `savedAccountMap: {}`
- `liveAccountMap: {}`

Actions (all synchronous reducers):
- `setFiles(state, action: PayloadAction<GenLedgerFile[]>)` — replaces `state.files`
- `setJournalNoPrefix(state, action: PayloadAction<string>)` — replaces `state.journalNoPrefix`
- `setLiveAccountEntry(state, action: PayloadAction<{ crmName: string; qbName: string }>)` —
  sets `state.liveAccountMap[crmName] = qbName`
- `initAccountMap(state, action: PayloadAction<Record<string, string>>)` — sets both
  `savedAccountMap` and `liveAccountMap` to the payload (called on page mount from GlobalSettings)
- `syncSavedAccountMap(state, action: PayloadAction<Record<string, string>>)` — sets
  `savedAccountMap` to the payload (called after a successful GlobalSettings save)

### `javelinSelect.ts`
- `selectFiles` — `state.javelin.files`
- `selectJournalNoPrefix` — `state.javelin.journalNoPrefix`
- `selectSavedAccountMap` — `state.javelin.savedAccountMap`
- `selectLiveAccountMap` — `state.javelin.liveAccountMap`
- `selectHasUnsavedMappingChanges` — `createSelector` over saved + live maps using `deepEqual`
  from `@/lib/primatives/typeUtils/deepEqual`; returns `!deepEqual(saved, live)`
- `selectUnmappedAccounts` — `createSelector` over files + liveAccountMap; collects all unique
  `row.account` values across all files, filters to those with no entry in `liveAccountMap`,
  returns `string[]`
- `selectAllAccountsMapped` — derived from `selectUnmappedAccounts`; `true` when length is 0

Export as `javelinSelect` object (matching project convention).

### GlobalSettings additions
- **Types**: add `genLedgerAccountMap: Record<string, string>` to `GlobalSettings`
- **Base**: add `genLedgerAccountMap: {}` to `baseGlobalSettings`
- **Model**: add `genLedgerAccountMap: { type: Object, default: {} }` to the Mongoose schema
- **Select**: add `selectGenLedgerAccountMap` selector; export on `globalSettingsSelect` object

### Store registration
Add to `src/store/reducers/index.ts`:
```typescript
import javelinReducer from "@/app/javelin/javelinSlice";
// in combineReducers:
javelin: javelinReducer,
```

---

## Step 2 — Parsing Layer

**Files touched:**
- `src/app/csv/generalLedger/genLedgerParser.ts` *(new)*
- `src/app/javelin/_lib/genLedgerSanityChecks.ts` *(new)*
- `src/components/dropZone/dropZone.tsx` *(modify)*

**What this step delivers:** The parsing infrastructure. The drop zone component (Step 4) will
import directly from these files.

### `genLedgerParser.ts`
Uses `createCSVParser<GenLedgerRow>` from `@/app/csv/_lib/parserFactory`:
- `columnMappings`: `{ Account: "account", TotalNetAmount: "totalNetAmount" }`
- `requiredColumns`: `["Account", "TotalNetAmount"]`
- `optionalColumns`: `[]`
- `transformations`: `{ TotalNetAmount: (val) => parseFloat(val) }`
- Zod schema: `account` is `z.string().min(1)`, `totalNetAmount` is `z.number()`
  (note: `z.number()` allows negative — that's intentional, credits are negative)

Export the parser as `parseGenLedger` (the result of calling `createCSVParser` with the config).

### `genLedgerSanityChecks.ts`
```typescript
type SanityCheck = (date: string) => string | null;

export const genLedgerSanityChecks: SanityCheck[] = [
  (date) => {
    const year = new Date(date).getFullYear();
    return year !== new Date().getFullYear()
      ? `Date ${date} is not in the current year`
      : null;
  },
];
```

### `dropZone.tsx` — add `multiple` prop
- Add `multiple?: boolean` to the props type (default `false`)
- Pass `multiple` to `useDropzone` config
- When `multiple` is true, update the placeholder text to:
  `"Drop CSVs here, or click to select."`

---

## Step 3 — Transform & Export

**Files touched:**
- `src/app/javelin/_lib/genLedgerTransform.ts` *(new)*

**What this step delivers:** The pure function that produces the downloadable CSV string. The
Download button in Step 6 calls this directly.

### `genLedgerTransform.ts`
```typescript
function transformToQBJournalCSV(
  files: GenLedgerFile[],
  accountMap: Record<string, string>,
  journalNoPrefix: string,
): string
```

Logic:
- Iterate `files` in order; assign `JournalNo` as `journalNoPrefix + String(index + 1).padStart(2, "0")`
- For each `row` in `file.rows`:
  - `AccountName` = `accountMap[row.account]`
  - `Debits` = `row.totalNetAmount > 0 ? row.totalNetAmount : ""`
  - `Credits` = `row.totalNetAmount < 0 ? Math.abs(row.totalNetAmount) : ""`
  - `JournalDate` = `file.date`
  - `JournalNo` = only populated on the **first row** of each file (QB convention shown in the
    sample — subsequent rows of the same journal entry leave `JournalNo` and `JournalDate` blank)

Wait — re-check the QB sample: `JournalNo` and `JournalDate` appear only on the first row of each
journal entry group. Implement accordingly.

Use `Papa.unparse` with headers `["*JournalNo", "*JournalDate", "*AccountName", "*Debits", "*Credits"]`.

Also export a helper `triggerCSVDownload(csvString: string, fileName: string): void` that creates
a Blob, a temporary anchor element, clicks it, and revokes the URL — standard browser download
pattern.

---

## Step 4 — Drop Zone Component

**Files touched:**
- `src/app/javelin/_lib/components/GenLedgerDropZone.tsx` *(new)*

**What this step delivers:** The upload entry point. After this step the page can accept files and
populate the Redux store.

### `GenLedgerDropZone.tsx`
Reads: nothing from Redux (stateless input component).
Dispatches: `javelinActions.setFiles`, `javelinActions.setLiveAccountEntry` (to seed new accounts
from the existing `savedAccountMap`).
Also reads: `globalSettingsSelect.genLedgerAccountMap` to seed `liveAccountMap` for already-known
accounts.

On file drop (receives `File[]` from `CSVDropzone`):
1. For each file:
   a. Validate filename: must match `/^\d{4}-\d{2}-\d{2}\.csv$/`. If not, push an error into
      `GenLedgerFile.errors` and skip parsing.
   b. Parse the date from the filename (first 10 chars).
   c. Run `genLedgerSanityChecks` against the date; collect any non-null results as `warnings`.
   d. Call `parseGenLedger(file)` — await the result.
   e. If parse fails, push errors into `GenLedgerFile.errors`.
   f. Assemble `GenLedgerFile` with `fileName`, `date`, `rows` (or `[]` on error), `warnings`,
      `errors`.
2. Dispatch `setFiles` with the assembled array.
3. For each unique account name across all successfully parsed files, if it exists in
   `savedAccountMap`, dispatch `setLiveAccountEntry({ crmName, qbName })` to pre-populate the
   live map. (Accounts not in `savedAccountMap` are left unmapped — the user fills them in.)

Layout: wraps `<CSVDropzone multiple={true} onFileDrop={...} />`. The `onFileDrop` callback
receives a single `File` — but since `multiple` is true, we need to handle the array. Check
whether `CSVDropzone` needs to expose an `onFilesDrop: (files: File[]) => void` variant, or if
we can use `onFileDrop` with the multi-file behavior. **Decision**: add `onFilesDrop` as an
alternative prop to `CSVDropzone` for multi-file mode, keeping `onFileDrop` for single-file
backward compatibility.

> **Note for Step 2 revision**: When implementing `dropZone.tsx`, also add the optional
> `onFilesDrop?: (files: File[]) => void` prop. When `multiple` is true and `onFilesDrop` is
> provided, call `onFilesDrop(acceptedFiles)` instead of `onFileDrop(acceptedFiles[0])`.

---

## Step 5 — Results Table

**Files touched:**
- `src/app/javelin/_lib/components/JavelinResultsTable.tsx` *(new)*

**What this step delivers:** The review UI. User can see parsed data and fill in any missing QB
account names before downloading.

### `JavelinResultsTable.tsx`
Reads: `javelinSelect.files`, `javelinSelect.liveAccountMap`
Dispatches: `javelinActions.setLiveAccountEntry`

Layout (per file section):
- Section header: `<h3>` showing `file.date` and `file.fileName`
- If `file.errors.length > 0`: render an error list (destructive text color); skip the table
- If `file.warnings.length > 0`: render a warning list (warning/muted color) above the table
- Table columns: **CRM Account** | **QB Account** | **Debits** | **Credits**
- Per row:
  - CRM Account: plain text (`row.account`)
  - QB Account:
    - If `liveAccountMap[row.account]` exists → plain text
    - If not → `<Input>` with `placeholder="QB account name"`, `onChange` dispatches
      `setLiveAccountEntry({ crmName: row.account, qbName: e.target.value })`
  - Debits: `row.totalNetAmount > 0` → `<Number isMoney decimals={2}>{row.totalNetAmount}</Number>` | blank
  - Credits: `row.totalNetAmount < 0` → `<Number isMoney decimals={2}>{Math.abs(row.totalNetAmount)}</Number>` | blank

If `files` is empty, render nothing (the drop zone is the only thing shown).

---

## Step 6 — Header & Page Shell

**Files touched:**
- `src/app/javelin/_lib/components/JavelinHeader.tsx` *(new)*
- `src/app/javelin/page.tsx` *(new)*

**What this step delivers:** The complete, wired-up page. Feature is fully functional after this step.

### `JavelinHeader.tsx`
Reads:
- `javelinSelect.journalNoPrefix`
- `javelinSelect.hasUnsavedMappingChanges`
- `javelinSelect.liveAccountMap`
- `javelinSelect.allAccountsMapped`
- `javelinSelect.files`
- `authSelect.role`
- `globalSettingsSelect.settings` (to pass current settings to `updateSettings`)

Dispatches:
- `javelinActions.setJournalNoPrefix`
- `javelinActions.syncSavedAccountMap`
- `globalSettingsActions.updateSettings`

Layout: horizontal flex row with:
1. `<h1>` or page title "Javelin"
2. `<Input>` labeled "Journal No Prefix" — value from `journalNoPrefix`, `onChange` dispatches
   `setJournalNoPrefix`
3. **Save Account Mappings** `<Button variant="primary" intensity="solid">` — rendered only when
   `hasUnsavedMappingChanges && role === "admin"`. On click:
   - Dispatch `globalSettingsActions.updateSettings({ params: { genLedgerAccountMap: liveAccountMap }, config: { showLoading: false } })`
   - On success (`.unwrap()`), dispatch `syncSavedAccountMap(liveAccountMap)`
   - On error, toast is handled by the thunk automatically
4. **Download QB CSV** `<Button variant="accent" intensity="solid">` — disabled when
   `!allAccountsMapped || files.length === 0`. On click:
   - Call `transformToQBJournalCSV(files, liveAccountMap, journalNoPrefix)`
   - Call `triggerCSVDownload(csvString, "qb-journal-entries.csv")`

### `page.tsx`
`"use client"` directive.

On mount (`useEffect`):
1. Dispatch `globalSettingsActions.getSettings(...)` with `showLoading: false`
2. After settings load, dispatch `javelinActions.initAccountMap(genLedgerAccountMap)`

The `initAccountMap` dispatch should happen in a `useEffect` that depends on
`globalSettingsSelect.genLedgerAccountMap` — when the map loads from the server, seed the slice.

Renders (inside a `<Container variant="page">`):
```
<JavelinHeader />
<GenLedgerDropZone />
<JavelinResultsTable />
```

---

## Task Status Table

| Step | Description | Status | Depends On |
|---|---|---|---|
| 1 | Data Foundation (types, slice, selectors, GlobalSettings, store) | ⬜ Not started | — |
| 2 | Parsing Layer (parser, sanity checks, dropZone `multiple` prop) | ⬜ Not started | Step 1 |
| 3 | Transform & Export (`genLedgerTransform.ts`) | ⬜ Not started | Step 1 |
| 4 | Drop Zone Component (`GenLedgerDropZone`) | ⬜ Not started | Steps 1, 2 |
| 5 | Results Table (`JavelinResultsTable`) | ⬜ Not started | Steps 1, 2 |
| 6 | Header & Page Shell (`JavelinHeader`, `page.tsx`) | ⬜ Not started | Steps 1, 3, 4, 5 |
