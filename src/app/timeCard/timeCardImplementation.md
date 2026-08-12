# TimeCard Module — Implementation Order

Each step builds on the previous. Steps within a phase can be done in any order unless noted.

---

## Phase 1 — Foundation (Done)

- [x] `TimeCardTypes.ts` — `Punch`, `CsvPunchRow`, `remapPunch`
- [x] `timeCardPolicy.ts` — `TimeCardPolicy`, `defaultTimeCardPolicy`

---

## Phase 2 — Storage

- [ ] `PunchModel.ts`
  - Mongoose schema for `Punch`
  - Unique index on `punchId`
  - `{ timestamps: true }`
  - Export via `createModel("Punch", PunchSchema)`

---

## Phase 3 — API

- [ ] `api/timeCardContract.ts`
  - `TimeCardContract extends ApiContract`
  - `importPunches`: `{ punches: Punch[] }` → `DataResponse<{ imported: number; errors: WriteError[] | null }>`
  - `getPunches`: `{ employeeIds?: string[]; dateRange?: TRange<string> }` → `DataResponse<Punch[]>`

- [ ] `api/route.ts`
  - `importPunches` handler (roles: `["admin", "office"]`)
    - `bulkWrite` with `updateOne + upsert: true` on `punchId`
    - Return count of upserted/modified docs
  - `getPunches` handler (roles: `["admin", "office", "tech"]`)
    - Filter by `employeeIds` and/or `dateRange` if provided
    - `cleanMongoArray` before returning
  - `export const POST = createRpcHandler(handlers)`

---

## Phase 4 — CSV Parser

- [ ] `timeCardParser.ts`
  - `ParseConfig<CsvPunchRow>` using `createCSVParser`
  - Map `TimeHeadId`, `EmployeeId`, `ReportDate`, `InOutTimeFormatted`
  - `InOutTimeFormatted` requires a pre-processing transform: split on `" / "`, parse each half to 24h `"HH:mm:00"`. Because `createCSVParser` maps one column to one field, handle this by mapping `InOutTimeFormatted` to a temporary field and using a post-transform or by pre-splitting the row in a wrapper before passing to the standard parser.
  - Zod schema validates `CsvPunchRow`
  - Export `parsePunches = createCSVParser<CsvPunchRow>(PUNCH_PARSE_CONFIG)`

---

## Phase 5 — Redux

- [ ] `timeCardSlice.ts`
  - State: `{ docs: Punch[] }`
  - `importPunches` thunk (`createStandardThunk`) — on fulfilled, merge by `punchId` (replace existing, append new)
  - `getPunches` thunk — on fulfilled, set `state.docs`
  - Export `timeCardActions`, `timeCardReducer`

- [ ] Register reducer in `src/store/reducers/index.ts`
  - Import `timeCardReducer`
  - Add `timeCard: timeCardReducer` to `combineReducers`

---

## Phase 6 — Selectors

- [ ] `timeCardSelect.ts`
  - `timeCardSelect.all` — `Punch[]` from `state.timeCard.docs`
  - `timeCardSelect.byEmployee` — `Map<string, Punch[]>` (grouped by `employeeId`)

---

## Phase 7 — TimeCard Class

- [ ] `TimeCard.ts`
  - Constructor: `(punches: Punch[], policy?: TimeCardPolicy)`
  - `get byEmployee(): Map<string, Punch[]>` — group by `employeeId`, then by `punchDate` within each employee (prerequisite for suspect detection)
  - `get suspectPunches(): Punch[]` — flag punches where `outTime === policy.suspectOutTime` or `inTime === policy.suspectInTime`; extend with multi-punch-per-day rules as they are defined
  - `get hasSuspectPunches(): boolean`
  - `get regularMinutes(): number` — total non-overtime minutes across all punches
  - `get overtimeMinutes(): number` — group by employee + ISO week, sum minutes, apply `weeklyOvertimeThresholdMinutes` threshold

---

## Phase 8 — Hook

- [ ] `useTimeCard.ts`
  - Dispatch `getPunches` with optional `dateRange: TRange<string>` and/or `employeeIds`
  - Follow existing hook patterns (dispatch in `useEffect`, include all deps)

---

## Phase 9 — UI (deferred)

UI components are not part of this implementation pass. The module is complete when the hook, selectors, and `TimeCard` class are in place and the import pipeline (CSV → API → Mongo) is functional.
