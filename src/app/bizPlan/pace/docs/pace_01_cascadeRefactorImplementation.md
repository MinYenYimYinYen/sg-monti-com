# Pace Cascade Refactor — Implementation

Reference: `pace_01_cascadeRefactorPlan.md`

All tasks are AI tasks. Work through them in order — each task unblocks the next.

---

## Tasks

- [ ] A1: **`employeeLookbackUtils.ts`** — remove `totalMaxDailyCSP`
  - Drop `totalMaxDailyCSP` from `LookbackStats` type
  - Drop `totalMaxByEmployee` accumulator from `selectEmployeeLookbackMap`
  - Drop `totalMaxDailyCSP` from `computeLookbackStats` signature and return
  - Keep `maxDailyCSP` (per-programType best day — used by Employee Card "push harder" indicator)

- [ ] A2: **`PaceType.ts`** — type surgery
  - Add `EmployeeCascadeEntry` and `EmployeeCascadeResult` types
  - Drop `EmployeeShare` and `EmployeePaceSummary`
  - Update `ServCodePace.employeeShares` to `Array<EmployeeCascadeEntry & { employee: Employee }>`
  - Update `EmployeeCardData`: add `totalAvgDailyCSP: CountSizePrice | null`, drop programType-breakdown fields

- [ ] A3: **`paceSelectRefactor.ts`** — new file, single source of truth
  - Absorbs all selectors from both `paceSelect.ts` and `employeePaceSelect.ts`
  - Layer 2: `selectEmployeeLookbackMap` (copy from `paceSelect.ts`, remove `totalMaxDailyCSP` tracking)
  - Layer 3: `selectEmployeeCascadeResults` — sequential-completion cascade per employee
    - Pre-compute weighted share pools (proportional to `avgDailyCSP`; even-split fallback for estimated)
    - Interval-by-interval simulation; drain highest-priority open servCode each interval
    - `alwaysAsap`: `openDate = closeDate = today`
    - `fractionConsumed` for estimated employees: average `totalAvgDailyCSP` of known co-workers on same servCode
    - `maxDailyRate` on each entry: per-programType max (from `LookbackStats.maxDailyCSP`); estimated employees get team average max
  - `selectEmployeeCascadeMap` — `Map<employeeId, EmployeeCascadeResult>`
  - Layer 4: `selectServCodePaces` — pure assembly from cascade; no cascade logic
  - `selectServCodePaceMap`, `selectProgCodePaces`, `selectUrgentServCodePaces`
  - `selectEmployeeCardData` — built from cascade results, no `EmployeePaceSummary`
  - Layer 5: `selectServCodePaceDeltaMap` — reads `availableFrom` from cascade; shared pool drain via `computePoolDrainDate`
  - `selectMatrixDeltaDaysBounds`, `selectMatrixFilteredSortedProgCodePaces`
  - Employee view selectors (previously in `employeePaceSelect.ts`):
    - `selectMainDate`, `selectEmployeeDates`, `selectPaceTolerance`, `selectShowUpcoming`
    - `selectDateBounds`, `selectWeekdayBounds`, `selectDateTicks`
    - `selectEmployeeUnfinishedShareMap`
    - `makeEffectiveDate` — factory selector
    - `makeProjectedAllocations` — reads `contributedCSP` and `availableFrom` from cascade; adjusts for slider date
    - `makeNotStartedAllocations` — reads from cascade instead of recomputing weighted share
    - `makeTimelineSegments` — factory selector
  - Export as single `paceSelect` const containing all selectors consumed downstream

- [ ] A4: **Delete `paceSelect.ts`** and **delete `employeePaceSelect.ts`**
  - Update all component imports that referenced `employeePaceSelect` to use `paceSelect` instead
  - Verify no remaining imports point to either deleted file

---

## Status

| Task | Status | Notes |
|---|---|---|
| A1 | ☐ | |
| A2 | ☐ | |
| A3 | ☐ | Largest task — core of the refactor |
| A4 | ☐ | Final cleanup + import updates |
