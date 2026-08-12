# TimeCard Module Plan

## Purpose

Store and report on employee punch data imported from CSV. Storage is minimal — only source data. All computation (overtime, suspect detection) lives in the `TimeCard` class, which is instantiated with a filtered `Punch[]` wherever reporting is needed.

---

## CSV Source Data

Only four columns are used. All others are ignored.

| Column             | Type in CSV    | Example                    |
|--------------------|----------------|----------------------------|
| `TimeHeadId`       | numeric string | `"12345"`                  |
| `EmployeeId`       | string         | `"EMP01"`                  |
| `ReportDate`       | string         | `"08/10/2026 00:00:00"`    |
| `InOutTimeFormatted` | string       | `"06:32 AM / 03:36 PM"`    |

---

## Types (`TimeCardTypes.ts`)

**`Punch`** — single storage and consumption type. No FK references to resolve, so no Doc/Props split is needed.

```typescript
type Punch = {
  punchId: number;    // TimeHeadId — natural key
  employeeId: string;
  punchDate: string;  // "yyyy-MM-dd"
  inTime: string;     // "HH:mm:00" 24h
  outTime: string;    // "HH:mm:00" 24h
}
```

**`CsvPunchRow`** — intermediate parse target produced by the CSV parser. Structurally identical to `Punch` today, but kept separate because the parser's `ParseConfig` target type must match the Zod schema exactly. When live punching is added (e.g., a `source: "csv" | "app"` field), `Punch` will diverge from `CsvPunchRow` and the distinction will matter.

```typescript
type CsvPunchRow = {
  punchId: number;
  employeeId: string;
  punchDate: string;
  inTime: string;
  outTime: string;
}
```

**`remapPunch(row: CsvPunchRow): Punch`** — maps `CsvPunchRow` to `Punch`. Trivial 1:1 today; the designated place to add punch-source metadata or other storage-level fields when live punching is implemented. Not used inside the CSV parser itself — the parser produces `CsvPunchRow[]`, and the API route calls `remapPunch` on each row before upserting.

---

## Policy (`timeCardPolicy.ts`)

Hardcoded constants structured for future `globalSettings` integration. The `TimeCard` class accepts an optional `TimeCardPolicy` (defaults to `defaultTimeCardPolicy`).

```typescript
type TimeCardPolicy = {
  weeklyOvertimeThresholdMinutes: number; // 2400 = 40 hours
  suspectOutTime: string;                 // "HH:mm:00" — auto-punch-out sentinel
  suspectInTime: string;                  // "HH:mm:00" — auto-punch-in sentinel
};

const defaultTimeCardPolicy: TimeCardPolicy = {
  weeklyOvertimeThresholdMinutes: 2400,
  suspectOutTime: "23:59:00",
  suspectInTime: "00:00:00",
};
```

---

## CSV Parser (`timeCardParser.ts`)

Uses the `createCSVParser` factory with a `ParseConfig<CsvPunchRow>`. Maps only the four required columns. All other CSV columns are ignored.

- `TimeHeadId` → `punchId` (parseInt)
- `EmployeeId` → `employeeId` (trim)
- `ReportDate` → `punchDate` (`"08/10/2026 00:00:00"` → `"2026-08-10"`)
- `InOutTimeFormatted` → split on `" / "`, parse each half to 24h `"HH:mm:00"`, round to nearest minute → `inTime` / `outTime`

Note: `InOutTimeFormatted` maps to two target fields. The transformation for this column is handled as a pre-processing step before the standard `ParseConfig` column mapping, since `createCSVParser` maps one CSV column to one target field. The split is done in a custom transform that returns a partial object merged into the row before schema validation.

---

## `TimeCard` Class (`TimeCard.ts`)

Pure computation — no Redux, no side effects. Constructed with `Punch[]` and optional `TimeCardPolicy`.

```typescript
class TimeCard {
  constructor(punches: Punch[], policy?: TimeCardPolicy)

  get regularMinutes(): number
  get overtimeMinutes(): number
  get byEmployee(): Map<string, Punch[]>
  get suspectPunches(): Punch[]
  get hasSuspectPunches(): boolean
}
```

**`byEmployee`** is the prerequisite for suspect detection. Some suspect scenarios involve multiple punch records for the same employee on the same date (not yet fully defined).

**Suspect detection** uses `policy.suspectOutTime` and `policy.suspectInTime` as sentinels. Additional rules (e.g., multi-punch-per-day) will be added as they are defined.

**Overtime** is computed by grouping punches by ISO week per employee and applying `weeklyOvertimeThresholdMinutes`. Minutes beyond the threshold in a given week are overtime.

---

## Mongoose Model (`PunchModel.ts`)

- Collection: `punches`
- Unique index on `punchId`
- Upsert via `bulkWrite` (`updateOne + upsert: true` filtered on `punchId`) — re-importing the same CSV is always safe
- Timestamps: `createdAt` / `updatedAt` via `{ timestamps: true }`

---

## API Contract (`api/timeCardContract.ts`)

```typescript
interface TimeCardContract extends ApiContract {
  importPunches: {
    params: { punches: Punch[] };
    result: DataResponse<{ imported: number; errors: WriteError[] | null }>;
  };
  getPunches: {
    params: { employeeIds?: string[]; dateRange?: TRange<string> };
    result: DataResponse<Punch[]>;
  };
}
```

- `importPunches`: roles `["admin", "office"]`
- `getPunches`: roles `["admin", "office", "tech"]`

---

## Redux Slice (`timeCardSlice.ts`)

State: `{ docs: Punch[] }`

- `importPunches` thunk — merges by `punchId` on fulfilled
- `getPunches` thunk — sets docs on fulfilled

---

## Selectors (`timeCardSelect.ts`)

```typescript
timeCardSelect.all         // Punch[]
timeCardSelect.byEmployee  // Map<string, Punch[]>
```

Suspect detection and overtime math are not in selectors — they live in `TimeCard`. Selectors provide the raw `Punch[]` that `TimeCard` is instantiated with.

---

## Hook (`useTimeCard.ts`)

Dispatches `getPunches` with optional `dateRange: TRange<string>` and/or `employeeIds`.

---

## Hydration Notes

`Punch` has no FK references, so there is no hydration within this module. When punch data is used alongside service/employee data for productivity analysis, the `TimeCard` class is the aggregation point — it receives a filtered `Punch[]` and provides the math. Selectors in consuming features will compose `Punch[]` with other data as inputs, following the same pattern as `centralSelectors.ts`. Punch data is not hydrated onto `Employee` objects.

---

## File Structure

```
src/app/timeCard/
  TimeCardTypes.ts        ← Punch, CsvPunchRow, remapPunch
  TimeCard.ts             ← TimeCard class
  timeCardPolicy.ts       ← TimeCardPolicy type + defaultTimeCardPolicy
  PunchModel.ts           ← Mongoose model
  timeCardParser.ts       ← CSV parser
  timeCardSlice.ts        ← Redux slice + thunks
  timeCardSelect.ts       ← Selectors
  useTimeCard.ts          ← Auto-fetch hook
  timeCardPlan.md         ← This document
  api/
    timeCardContract.ts
    route.ts
```
