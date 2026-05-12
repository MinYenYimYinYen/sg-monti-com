# Pace Cascade Refactor — Implementation

Reference: `pace_01_cascadeRefactorPlan.md`

All tasks are AI tasks. Work through them in order — each task unblocks the next.

---

## Tasks

- [ ] A1: **`employeeLookbackUtils.ts`** — remove `totalMaxDailyCSP`
  - Drop `totalMaxDailyCSP` from `LookbackStats` type
  - Drop `totalMaxByEmployee` accumulator from `selectEmployeeLookbackMap`
  - Drop `totalMaxDailyCSP` from `computeLookbackStats` signature and return

- [ ] A2: **`PaceType.ts`** — type surgery
  - Add `EmployeeCascadeEntry` and `EmployeeCascadeResult` types
  - Drop `EmployeeShare` and `EmployeePaceSummary`
  - Update `ServCodePace.employeeShares` to `Array<EmployeeCascadeEntry & { employee: Employee }>`
  - Update `EmployeeCardData`: add `totalAvgDailyCSP: CountSizePrice | null`, drop any programType-breakdown fields

- [ ] A3: **`paceSelectRefactor.ts`** — new file, Layers 2–5
  - Layer 2: `selectEmployeeLookbackMap` (copy from `paceSelect.ts`, remove `totalMaxDailyCSP` tracking)
  - Layer 3: `selectEmployeeCascadeResults` — sequential-completion cascade per employee
    - Pre-compute weighted share pools (proportional to `avgDailyCSP`; even-split fallback for estimated)
    - Interval-by-interval simulation; drain highest-priority open servCode each interval
    - `alwaysAsap`: `openDate = closeDate = today`
    - `fractionConsumed` for estimated employees: average `totalAvgDailyCSP` of known co-workers on same servCode
  - `selectEmployeeCascadeMap` — `Map<employeeId, EmployeeCascadeResult>`
  - Layer 4: `selectServCodePaces` — pure assembly from cascade; no cascade logic
  - `selectServCodePaceMap`, `selectProgCodePaces`, `selectUrgentServCodePaces`
  - `selectEmployeeCardData` — built from cascade results, no `EmployeePaceSummary`
  - Layer 5: `selectServCodePaceDeltaMap` — reads `availableFrom` from cascade; shared pool drain via `computePoolDrainDate`
  - `selectMatrixDeltaDaysBounds`, `selectMatrixFilteredSortedProgCodePaces`
  - Export as `paceSelect` (drop-in replacement for `paceSelect.ts`)

- [ ] A4: **`employeePaceSelect.ts`** — simplify allocation selectors
  - `makeSelectProjectedAllocations`: read `contributedCSP` and `availableFrom` from cascade result; adjust for slider date
  - `makeSelectNotStartedAllocations`: same — read from cascade instead of recomputing weighted share
  - Remove any local weighted-share recomputation logic that duplicates the cascade

- [ ] A5: **Delete `paceSelect.ts`** — verify no remaining imports, then delete

---

## Status

| Task | Status | Notes |
|---|---|---|
| A1 | ☐ | |
| A2 | ☐ | |
| A3 | ☐ | Largest task — core of the refactor |
| A4 | ☐ | Depends on A3 |
| A5 | ☐ | Final cleanup |
