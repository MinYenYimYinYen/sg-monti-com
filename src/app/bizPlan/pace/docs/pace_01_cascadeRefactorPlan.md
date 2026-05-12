# Pace Cascade Refactor — Plan

## Problem Statement

The current selector flow has two structural issues that cause anomalies in both the matrix and
employee views:

1. **Two cascade models coexist.** Layer 3 (`selectServCodePaces`) uses a daily-fraction model
   (capacity split across servCodes simultaneously). Layer 4 (`selectServCodePaceDeltaMap`) uses a
   sequential-completion model (finish one servCode before starting the next). The intent is the
   sequential model everywhere, but the daily-fraction model drives `employeeShares`, `fractionConsumed`,
   and the employee card — so the employee view is built on the wrong model.

2. **The cascade and servCode assembly are tangled.** `selectServCodePaces` runs the cascade per
   employee and writes results back onto the servCode as `employeeShares[]`. This makes the selector
   hard to reason about and easy to break when either the cascade logic or the servCode shape changes.

The fix: pull the cascade into its own employee-first layer, use the sequential-completion model
everywhere, and make the servCode assembly a pure read from the cascade result.

---

## Desired Behaviors

### Matrix view
- Each servCode row shows `activeAsapCSP` (or per-day / per-day-per-employee variants) as the
  remaining work quantity.
- Delta badges show `deltaDays` — how many weekdays ahead/behind the team is projected to finish,
  using the sequential-completion cascade.
- Checking/unchecking an employee on a servCode updates the cascade and delta in real time.

### Employee view
- Each employee card shows their allocated servCodes in priority order.
- `fractionConsumed` per servCode reflects the sequential-completion model: how much of a typical
  day this servCode consumes, accounting for higher-priority servCodes finishing first.
- The cascade gate is correct: if a higher-priority servCode will still be running when a
  lower-priority one opens, the lower-priority one shows zero expected CSP until the employee
  becomes available.
- `totalFractionConsumed` sums correctly across all servCodes.
- When `requiredDailyRate > avgDailyCSP` but `≤ maxDailyCSP`, the UI shows an upward-arrow /
  orange "push harder" indicator. When `requiredDailyRate > maxDailyCSP`, it's beyond their
  historical peak.

---

## Data Sources

All existing data sources are reused. No new API routes needed.

| Source | What it provides |
|---|---|
| `deepSelect.servCodes` | `ServCodeDeep[]` — servCodes with their services |
| `progServSelect.progCodes` | `ProgCode[]` — program groupings |
| `centralSelect.services` | `Service[]` — all customer service records |
| `employeeSelect.employeeMap` | `Map<employeeId, Employee>` — employees with priority-ordered `servCodeIds[]` |
| `assignmentPlanSelect.assignmentsByEmployeeId` | `Map<employeeId, { servCodeIds[] }>` |
| `state.pace.lookbackConfig` | `LookbackConfig` — lookback window and threshold |

---

## Selector Flow

### Layer 1 — Raw ServCode Data (`rawPaceSelect.ts`) — **unchanged**

Selectors: `rawServCodePaces`, `rawServCodePacesPerDay`, `rawServCodePacesPerDayPerEmployee`,
`rawProgCodePaces` and their map variants.

Key outputs per servCode:
- `unfinishedCSP` — total remaining (active + asap + printed). Used for matrix "total" display.
- `activeAsapCSP` — remaining excluding printed. The projection pool.
- `projectionStartDate` — day after latest printed schedDate (or `max(today, dateRange.min)`).
- `unfinishedPerDay` — `activeAsapCSP / unfinishedDayCount`. Matrix "per day" display.
- `unfinishedPerDayPerEmployee` — `unfinishedPerDay / assignedCount`. Matrix "per day per employee"
  display. Naive headcount division — a display convenience, not a forecast input.
- `finishedCSP`, `finishedRate` — completed work. Display only.

`RawServCodePacePerDayPerEmployee` and its selectors are **kept** (display convenience, not
forecast input).

---

### Layer 2 — Employee Lookback (`employeeLookbackUtils.ts` + `paceSelectRefactor.ts`) — **unchanged**

Selector: `selectEmployeeLookbackMap` → `Map<employeeId, Map<programTypeKey, LookbackStats | null>>`

Key outputs per (employee, programType):
- `avgDailyCSP` — historical mean daily production. The cascade weight and daily rate.
- `maxDailyCSP` — best single day for this programType. Used by the employee view "push harder"
  indicator: when `requiredRate > avgDailyCSP` but `≤ maxDailyCSP`, the manager can push harder.
  Not used in any forecast calculation.
- `totalAvgDailyCSP` — mean daily output across all programTypes. The capacity ceiling and
  `fractionConsumed` denominator.

`totalMaxDailyCSP` is **dropped** — not used in display or calculations.

Changes to `employeeLookbackUtils.ts`:
- Remove `totalMaxDailyCSP` from `LookbackStats`.
- Remove `totalMaxDailyCSP` from `computeLookbackStats` return value.
- Remove `totalMaxByEmployee` accumulator from `selectEmployeeLookbackMap`.

---

### Layer 3 — Employee Cascade (`paceSelectRefactor.ts`) — **new**

Selector: `selectEmployeeCascadeResults` → `EmployeeCascadeResult[]`

This is the core new layer. It runs once, produces a single authoritative result, and feeds both
views.

**Algorithm** (sequential-completion, per-employee weighted share):

For each employee (from `employeeMap.values()`), in their `servCodeIds[]` priority order:

1. **Compute weighted share pool per servCode.**
   For each servCode in the employee's priority list:
   - `teamAvgCSP` = sum of `avgDailyCSP` for all assigned employees with lookback data for this
     servCode's `programType`. Employees without lookback data contribute the team average rate
     (not a neutral "1 unit" weight).
   - `employeeShare` = `activeAsapCSP × (employee.avgDailyCSP / teamAvgCSP)`.
   - If the employee has no lookback data: `employeeShare = activeAsapCSP / assignedCount` (even split).
   - This is the employee's personal work pool for this servCode.

2. **Simulate the timeline interval by interval.**
   Collect all boundary dates: `today` + every `openDate` + every `closeDate` across all servCodes
   in the priority list. Sort ascending.

   For each interval `[intervalStart, intervalEnd)`:
   - Count weekdays in the interval.
   - Find the highest-priority servCode that is **open** during this interval:
     `openDate ≤ intervalStart` AND `closeDate ≥ intervalEnd` AND `remainingPool > 0`.
   - Drain: `drained = min(dailyRate × weekdays, remainingPool)`.
   - Record `availableFrom[servCodeId] = intervalStart` (first time this servCode is worked).
   - Accumulate `contributedCSP[servCodeId] += drained`.
   - Deduct from `remainingPool[servCodeId]`.
   - Move to next interval.

3. **Compute `fractionConsumed` per servCode.**
   `fractionConsumed = contributedCSP / totalAvgDailyCSP` (per dimension).
   This is the fraction of a typical day consumed by this servCode over the season.
   For estimated employees (no lookback data), use the average `totalAvgDailyCSP` of other
   employees assigned to the same servCode who do have lookback data. If no employees have
   lookback data, `fractionConsumed = null`.

4. **Assemble `EmployeeCascadeResult`.**

**Employees without lookback data** for a programType:
- `dailyRate` = average of known employees' `avgDailyCSP` for that programType. If no known
  employees, use `{ count: 1, size: 1, price: 1 }` as a last resort.
- `maxDailyCSP` = average of known employees' `maxDailyCSP` for that programType (same fallback).
- `isEstimated = true`.

**`alwaysAsap` servCodes in the cascade:**
- `openDate = today`, `closeDate = today` (treated as overdue — 1 day remaining).
- They are always "open" in the first interval, so high-priority `alwaysAsap` servCodes consume
  capacity first. Low-priority ones get whatever remains.
- The weighted share pool = `activeAsapCSP` (same as any other servCode).

**`openDate`** for each servCode = `projectionStartDate` from `rawServCodePacesPerDay`
(day after latest printed schedDate, or `max(today, dateRange.min)`).

**`closeDate`** = `servCode.dateRange.max` (or `today` for `alwaysAsap`).

---

### Layer 4 — ServCode Assembly (`paceSelectRefactor.ts`) — **replaces `selectServCodePaces`**

Selector: `selectServCodePaces` → `ServCodePace[]`

Pure assembly — no cascade logic. For each servCode:

1. Look up each assigned employee's `EmployeeCascadeEntry` from Layer 3.
2. Build `employeeShares: EmployeeShare[]` from the cascade entries.
3. Compute `teamExpectedCSP` = sum of `contributedCSP` across all employees (normalized to per-day
   by dividing by `unfinishedDayCount`).
4. Compute `teamAvgCapacity` = sum of `dailyRate` across all employees.
5. Compute `paceDelta`, `paceDeltaPct`.

`ServCodePace` shape is unchanged. `EmployeeShare` is replaced by a cleaner type (see Type Changes).

---

### Layer 5 — Delta Projection (`paceSelectRefactor.ts`) — **simplified**

Selector: `selectServCodePaceDeltaMap` → `Map<servCodeId, ServCodePaceDelta>`

Uses `availableFrom` from Layer 3 directly — no need to re-run the cascade.

For each servCode:
1. Build availability list: for each assigned employee, their `availableFrom` date from Layer 3
   and their `dailyRate` for this servCode.
2. Run shared pool drain: all employees pull from the same `activeAsapCSP` pool, becoming available
   at their `availableFrom` date. Pool drains at the combined rate of currently-available employees.
3. Compute `projectedEndDate`, `deltaDays`, `deltaDaysCSP`.

`computePoolDrainDate` is reused unchanged.

---

### Layer 6 — Employee Card / Matrix Views

**Matrix** reads: `ServCodePace` (Layer 4), `ServCodePaceDelta` (Layer 5), `rawServCodePacesPerDay`
and `rawServCodePacesPerDayPerEmployee` (Layer 1 — for display mode variants).

**Employee view** reads: `EmployeeCascadeResult` (Layer 3) directly for `fractionConsumed`,
`availableFrom`, `contributedCSP`, `maxDailyCSP`. The `makeSelectProjectedAllocations` selector in
`employeePaceSelect.ts` is simplified — instead of recomputing the weighted share from scratch,
it reads `contributedCSP` from the cascade result and adjusts for the slider date.

`EmployeeCardData` is built from `EmployeeCascadeResult[]` — no intermediate `EmployeePaceSummary`.

---

## Type Changes

### Types to keep (unchanged)
- `RawServCodePace`
- `RawServCodePacePerDay`
- `RawServCodePacePerDayPerEmployee`
- `RawProgCodePace`
- `ServCodePace` — shape unchanged; `employeeShares` field type changes (see below)
- `ProgCodePace`
- `EmployeeAllocation` — used by employee view
- `EmployeeCardData` — simplified (see below)
- `ServCodePaceDelta`
- `LookbackConfig`

### Types to drop
- **`EmployeeShare`** — replaced by `EmployeeCascadeEntry` (see below).
- **`EmployeePaceSummary`** — intermediate grouping by `(employee, programType)` that existed
  because the old cascade ran per-programType. The new cascade runs per-employee across all
  programTypes in priority order, so this grouping is no longer needed.

### `LookbackStats` — simplified (in `employeeLookbackUtils.ts`)
Remove `totalMaxDailyCSP`. Keep `maxDailyCSP`, `avgDailyCSP`, `totalAvgDailyCSP`.

```typescript
export type LookbackStats = {
  maxDailyCSP: CountSizePrice;      // best single day for this programType (display / "push harder")
  avgDailyCSP: CountSizePrice;      // mean daily production for this programType (cascade weight)
  totalAvgDailyCSP: CountSizePrice; // mean daily output across all programTypes (capacity ceiling)
};
```

### Types to add (`PaceType.ts`)

```typescript
/** Per-servCode result of the employee cascade simulation. */
type EmployeeCascadeEntry = {
  /** First date this employee works this servCode. undefined = never available (higher-priority
   *  servCode consumed all their time during this servCode's window). */
  availableFrom: string | undefined;
  /** Total work this employee contributes to this servCode over the season (their weighted share). */
  contributedCSP: CountSizePrice;
  /** Employee's avgDailyCSP for this servCode's programType. Used as the daily drain rate and
   *  for the shared pool drain in Layer 5. */
  dailyRate: CountSizePrice;
  /** Employee's maxDailyCSP for this servCode's programType. Used by the "push harder" indicator:
   *  when requiredRate > dailyRate but ≤ maxDailyRate, the manager can push harder. */
  maxDailyRate: CountSizePrice;
  /** contributedCSP / totalAvgDailyCSP — fraction of a typical day consumed by this servCode.
   *  null if no lookback data exists for any assigned employee (can't estimate totalAvgDailyCSP). */
  fractionConsumed: CountSizePrice | null;
  /** True if dailyRate was estimated (no lookback data for this programType). */
  isEstimated: boolean;
};

/** Full cascade result for one employee across all their assigned servCodes. */
type EmployeeCascadeResult = {
  employee: Employee;
  /** Cross-programType capacity ceiling. Denominator for fractionConsumed. null if no lookback data. */
  totalAvgDailyCSP: CountSizePrice | null;
  /** Per-servCode cascade entries, keyed by servCodeId. Only contains servCodes in the
   *  employee's priority list (servCodeIds[]). */
  byServCode: Map<string, EmployeeCascadeEntry>;
};
```

### Types to simplify

**`EmployeeShare`** — drop entirely. `ServCodePace.employeeShares` becomes:
```typescript
employeeShares: Array<EmployeeCascadeEntry & { employee: Employee }>;
```

**`EmployeeCardData`** — remove `programType` breakdown (that was `EmployeePaceSummary`'s job):
```typescript
type EmployeeCardData = {
  employee: Employee;
  totalAvgDailyCSP: CountSizePrice | null;
  /** Priority-ordered allocations across all servCodes */
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
  isOverloaded: boolean;
};
```

---

## File Map

| File | Action | Notes |
|---|---|---|
| `rawPaceSelect.ts` | Keep unchanged | `perDayPerEmployee` selectors stay |
| `RawPaceTypes.ts` | Keep unchanged | |
| `employeeLookbackUtils.ts` | Remove `totalMaxDailyCSP` from `LookbackStats` and `computeLookbackStats` | |
| `PaceType.ts` | Add `EmployeeCascadeEntry`, `EmployeeCascadeResult`; update `EmployeeCardData`; drop `EmployeeShare`, `EmployeePaceSummary` | |
| `paceSelectRefactor.ts` | **New** — Layers 2–5 | Replaces `paceSelect.ts` once verified |
| `paceSelect.ts` | Keep during transition, delete after | |
| `employee/employeePaceSelect.ts` | Simplify `makeSelectProjectedAllocations` and `makeSelectNotStartedAllocations` | Read from cascade result instead of recomputing |
| `employee/components/` | No changes expected | Views are already correct |
| `assignmentPlan/matrix/` | No changes expected | |

---

## Implementation Tasks

### Human Tasks

- [ ] Y1: **Update `employeeLookbackUtils.ts`** — remove `totalMaxDailyCSP` from `LookbackStats`
  and from `computeLookbackStats`. Remove `totalMaxByEmployee` accumulator from
  `selectEmployeeLookbackMap` in `paceSelectRefactor.ts` (or handle in Y4).

- [ ] Y2: **Update `PaceType.ts`** — add `EmployeeCascadeEntry`, `EmployeeCascadeResult`; update
  `EmployeeCardData` (add `totalAvgDailyCSP`, remove programType breakdown); drop `EmployeeShare`
  and `EmployeePaceSummary`. Update `ServCodePace.employeeShares` field type.

- [ ] Y3: **Write `paceSelectRefactor.ts`** — implement Layers 2–5 as described above:
  - `selectEmployeeLookbackMap` (copy from `paceSelect.ts`, remove `totalMaxDailyCSP` tracking)
  - `selectEmployeeCascadeResults` (new Layer 3)
  - `selectEmployeeCascadeMap` (`Map<employeeId, EmployeeCascadeResult>` for O(1) lookup)
  - `selectServCodePaces` (Layer 4 — assembly from cascade)
  - `selectServCodePaceMap`
  - `selectProgCodePaces`
  - `selectEmployeeCardData` (built from cascade results, no `EmployeePaceSummary`)
  - `selectServCodePaceDeltaMap` (Layer 5 — simplified, reads `availableFrom` from cascade)
  - `selectMatrixDeltaDaysBounds`
  - `selectMatrixFilteredSortedProgCodePaces`
  - `selectUrgentServCodePaces`
  - Export as `paceSelect` (same name, drop-in replacement)

- [ ] Y4: **Update `employeePaceSelect.ts`** — simplify `makeSelectProjectedAllocations` and
  `makeSelectNotStartedAllocations` to read `contributedCSP`, `availableFrom`, `maxDailyRate` from
  the cascade result instead of recomputing the weighted share from scratch.

- [ ] Y5: **Delete `paceSelect.ts`** and verify no remaining imports point to it.

---

## Resolved Decisions

| # | Decision |
|---|---|
| 1 | "Per day per employee" display mode stays as naive `unfinishedPerDay / assignedCount`. Display convenience only, not a forecast input. |
| 2 | `maxDailyCSP` kept in `LookbackStats` and on `EmployeeCascadeEntry` (as `maxDailyRate`). Used by the employee view "push harder" indicator: `requiredRate > avgDailyCSP` but `≤ maxDailyCSP` → upward arrow + orange. Not used in forecasting. |
| 3 | `totalMaxDailyCSP` dropped from `LookbackStats` — not used in display or calculations. |
| 4 | `alwaysAsap` servCodes treated as overdue in the cascade: `openDate = today`, `closeDate = today`. Always open in the first interval; high-priority ones consume capacity first. |
| 5 | `fractionConsumed` for estimated employees: use the average `totalAvgDailyCSP` of other employees assigned to the same servCode who have lookback data. If none, `fractionConsumed = null`. No circularity — it's a one-time lookup of known employees' totals. |
