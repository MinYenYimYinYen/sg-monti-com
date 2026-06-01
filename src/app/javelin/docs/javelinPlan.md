# Javelin — Phase 1 Plan

## What We're Building

Javelin is a client-side-only tool for converting General Ledger CSV exports from the CRM into
QuickBooks Online journal entry import CSVs. No data is persisted from the parsed files — the
feature is purely a transformation pipeline: upload → review → download.

---

## Desired Behaviors & UX

### Upload
- User drops one or more CSV files onto a multi-file drop zone.
- Each file must be named `YYYY-MM-DD.csv` (exactly). The date in the filename is the journal date
  for that entry. If the filename doesn't match this format, the file is rejected with an error
  shown in the results table.
- Sanity checks run after a successful parse. Currently one check: warn if the date is not in the
  current year. The sanity check list lives in `genLedgerSanityChecks.ts` and is easy to extend.

### Results Table
- After upload, a results section appears below the drop zone.
- Results are grouped by file (date). Each group shows:
  - The filename / date as a section header
  - Any parse errors or sanity warnings for that file
  - A table with columns: **CRM Account Name** | **QB Account Name** | **Debits** | **Credits**
- For each row in the table:
  - If the CRM account name has a saved QB mapping → show the QB name as text, and show the
    amount in the appropriate Debit or Credit column using `<Number isMoney decimals={2}>`.
  - If the CRM account name is **not yet mapped** → show a text `<Input>` in the QB Account Name
    cell. The user types the QB name; this updates `liveAccountMap` in the slice.
- Debit/Credit logic: positive `TotalNetAmount` → Debit column; negative → Credit column (abs value).

### Header Controls
- **Journal No Prefix** input: pre-filled with `SAGL YYMMDD-` (today's date, formatted as 2-digit
  year + month + day). Editable in case the user needs to override (e.g., second session same day).
  The suffix (01, 02…) is auto-assigned per file during export.
- **Save Account Mappings** button: appears only when there are staged mapping changes
  (`hasUnsavedMappingChanges`) AND the user is admin. Saves `liveAccountMap` to GlobalSettings
  via the existing `updateSettings` thunk, then syncs `savedAccountMap` in the slice.
- **Download QB CSV** button: enabled only when all accounts are mapped and at least one file is
  loaded. Triggers the transform and initiates a browser file download.

---

## Data Sources

### Input
- CRM CSV files. Only two columns are used: `Account` and `TotalNetAmount`.
- No API calls needed for parsing — all client-side.

### Account Mapping
- Stored in `GlobalSettings.genLedgerAccountMap: Record<string, string>` (CRM name → QB name).
- Loaded on page mount via the existing `globalSettingsActions.getSettings` thunk.
- Saved via the existing `globalSettingsActions.updateSettings` thunk.
- No new API route needed.

---

## Component Tree

```
page.tsx (javelin)
├── JavelinHeader
│   ├── <Input> Journal No Prefix
│   ├── <Button> Save Account Mappings  (conditional: admin + hasUnsavedMappingChanges)
│   └── <Button> Download QB CSV        (conditional: allAccountsMapped + files loaded)
├── GenLedgerDropZone
│   └── CSVDropzone (multiple={true})
└── JavelinResultsTable
    └── [per file]
        ├── Section header (date / filename)
        ├── Errors / warnings list
        └── Table
            └── [per row]
                ├── CRM Account Name (text)
                ├── QB Account Name  (text if mapped | <Input> if not)
                ├── Debits           (<Number> if positive | blank)
                └── Credits          (<Number> if negative, abs | blank)
```

---

## State Management

### New slice: `javelinSlice.ts`

State shape (`JavelinState` in `JavelinTypes.ts`):
```typescript
type JavelinState = {
  files: GenLedgerFile[];
  journalNoPrefix: string;
  savedAccountMap: Record<string, string>;  // mirrors what's persisted in GlobalSettings
  liveAccountMap: Record<string, string>;   // staged edits (may differ from saved)
};
```

Actions:
- `setFiles(files: GenLedgerFile[])` — replaces the file list after a new upload
- `setJournalNoPrefix(prefix: string)` — user edits the prefix input
- `setLiveAccountEntry({ crmName, qbName })` — user types a QB name for an unmapped account
- `initAccountMap(map: Record<string, string>)` — seeds both `savedAccountMap` and `liveAccountMap`
  from GlobalSettings on page mount
- `syncSavedAccountMap(map: Record<string, string>)` — called after a successful save; aligns
  `savedAccountMap` with `liveAccountMap` to clear the dirty state

No thunks in this slice. Saving the map reuses `globalSettingsActions.updateSettings`.

### New selectors: `javelinSelect.ts`
- `files`, `journalNoPrefix`, `savedAccountMap`, `liveAccountMap` — direct state reads
- `hasUnsavedMappingChanges` — `!deepEqual(savedAccountMap, liveAccountMap)`
- `unmappedAccounts` — unique CRM account names across all files with no entry in `liveAccountMap`
- `allAccountsMapped` — `unmappedAccounts.length === 0`

---

## Type Additions & Changes

### New types in `JavelinTypes.ts`
```typescript
type GenLedgerRow = {
  account: string;
  totalNetAmount: number;
};

type GenLedgerFile = {
  fileName: string;
  date: string;       // ISO date string parsed from filename
  rows: GenLedgerRow[];
  warnings: string[]; // sanity check messages
  errors: string[];   // parse errors or filename format errors
};
```

### GlobalSettings additions
- `GlobalSettingsTypes.ts`: add `genLedgerAccountMap: Record<string, string>`
- `baseGlobalSettings.ts`: add `genLedgerAccountMap: {}`
- `GlobalSettingsModel.ts`: add `genLedgerAccountMap: { type: Object, default: {} }`
- `globalSettingsSelect.ts`: add `genLedgerAccountMap` selector

---

## New Files Summary

| File | Purpose |
|---|---|
| `src/app/javelin/JavelinTypes.ts` | `GenLedgerRow`, `GenLedgerFile`, `JavelinState` |
| `src/app/javelin/javelinSlice.ts` | Redux slice — files, prefix, account map (saved + live) |
| `src/app/javelin/javelinSelect.ts` | Selectors including dirty-check and unmapped accounts |
| `src/app/javelin/page.tsx` | Page shell — loads GlobalSettings on mount |
| `src/app/javelin/_lib/genLedgerTransform.ts` | Pure fn: files + map + prefix → QB CSV string |
| `src/app/javelin/_lib/genLedgerSanityChecks.ts` | Array of date sanity check functions |
| `src/app/javelin/_lib/components/GenLedgerDropZone.tsx` | Multi-file drop zone with filename validation |
| `src/app/javelin/_lib/components/JavelinHeader.tsx` | Prefix input + Save Mappings + Download buttons |
| `src/app/javelin/_lib/components/JavelinResultsTable.tsx` | Per-file grouped results with mapping inputs |
| `src/app/csv/generalLedger/genLedgerParser.ts` | `createCSVParser` config for GL input CSVs |

### Modified Files
| File | Change |
|---|---|
| `src/components/dropZone/dropZone.tsx` | Add optional `multiple?: boolean` prop |
| `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` | Add `genLedgerAccountMap` |
| `src/app/globalSettings/_lib/baseGlobalSettings.ts` | Add default `{}` |
| `src/app/globalSettings/_lib/GlobalSettingsModel.ts` | Add schema field |
| `src/app/globalSettings/_lib/globalSettingsSelect.ts` | Add selector |
| `src/store/reducers/index.ts` | Register `javelinReducer` |

---

## Output CSV Format

One combined CSV is downloaded containing all journal entries from all uploaded files.
Columns (required QB Online journal entry import fields only):

| Column | Value |
|---|---|
| `*JournalNo` | `{prefix}{nn}` e.g. `SAGL 260601-01` |
| `*JournalDate` | Date from filename e.g. `2026-05-29` |
| `*AccountName` | Mapped QB account name |
| `*Debits` | Amount if `TotalNetAmount > 0`, else blank |
| `*Credits` | `abs(TotalNetAmount)` if negative, else blank |

Files are processed in upload order; each file gets the next sequential suffix (01, 02…).

---

## Journal No Prefix Logic

- Default: `SAGL ` + today's date as `YYMMDD` + `-` → e.g. `SAGL 260601-`
- Fully editable by the user before download (to handle multiple sessions in one day)
- Suffix is always 2-digit zero-padded, starting at `01`, auto-incremented per file

---

## Sanity Checks

Defined as an array of `(date: string) => string | null` functions in `genLedgerSanityChecks.ts`.
A non-null return is a warning message surfaced in the results table for that file.

**Current checks:**
1. Date is not in the current year → `"Date {date} is not in the current year"`

---

## Open Questions / Decisions Made

| Question | Decision |
|---|---|
| Persist parsed data? | No — transform only, no backend storage |
| One output CSV or one per file? | One combined CSV |
| Who can save account mappings? | Admin only |
| Where is the account map stored? | `GlobalSettings.genLedgerAccountMap` |
| How is journal date determined? | Parsed from filename (`YYYY-MM-DD.csv` required) |
| What if a file has an invalid name? | Rejected at parse-time; error shown in results table |
| Optional QB columns (Description, Name, etc.)? | Omitted from output |
