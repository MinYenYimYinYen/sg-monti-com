# Pace — Employee Pace Plan

## Extension Index: `pace_03`

**Reference:** See `pace_03_interview.md` for the full Q&A that produced this plan.

---

## Goal

Replace the current even-split `EmployeeShare` model with a lookback-driven capacity model.
Surface per-employee pace metrics and capacity allocation in the existing pace UI, with a
drill-down popover for employee detail.

**Problems being solved:**
1. An employee assigned to multiple servCodes has their capacity double-counted — the even split
   treats each servCode independently.
2. The even split ignores actual employee production history — it's close to meaningless for
   real scheduling decisions.

---

## Desired Behaviors

### ServCodePace level (existing card, enhanced)
- Each `EmployeeShare` shows a lookback-derived `shareCSP` instead of the even split.
- A **delta** and **delta%** is shown at the servCode level: sum of employee `shareCSP` vs.
  `unfinishedRate`. Tells the manager whether the assigned team can hit the required pace.
- Employees who are overloaded (capacity consumed > 100% across all their servCodes) get a
  visual warning indicator.

### Employee detail popover (new)
- Clicking an employee name in a `ServCodePaceCard` opens a popover.
- Popover shows: all servCodes assigned to this employee, their `programType` max and average
  daily production, fraction of capacity consumed per servCode, total capacity consumed, and
  free capacity fraction.
- Component is designed to be reusable on a future standalone employee page (not built now).

### Display config
- The unit of production (count / size / price) is user-selectable. Default: count.
- The lookback window is user-configurable (weekdays only). Default: current season.
- A completion threshold is user-configurable: days where the employee completed less than X%
  of assigned work are excluded from the lookback. Default: 0% (only fully-missed days excluded).

---

## Data Sources

All data is already loaded via `usePaceDeps`. No new API routes needed.

| Data | Source |
|---|---|
| Finished services with `doneBys` | `Service.production.doneBys[]` via `deepSelect.servCodes` |
| Assignment history | `Service.assignments[]` (`AssignmentDoc[]`) |
| `programType` grouping key | `ServCodeDeep.progCode.programType` |
| Employee identity | `Employee` (already hydrated on `ServCodeDeep.assignedTo[]`, priority-ordered) |
| Employee priority per servCode | `ServCodeDeep.assignedTo[]` index — index 0 = highest priority |

---

## AssignmentPlan Flip (completed as Y0)

`AssignmentPlan` was flipped from `{ servCodeId, employeeIds[] }` to
`{ employeeId, servCodeIds[] }` (ordered by priority, index 0 = highest). This enables the
cascade model below.

`ServCode.assignedTo[]` continues to be hydrated via `progServSelect` using an inverted selector
in `assignmentPlanSelect`. The order of `assignedTo[]` now carries meaning — index 0 is the
highest-priority employee for that servCode.

---

## Lookback Computation

### Step 1 — Identify valid production days

For each date in the lookback window:
- Collect all finished services (`status === "S"`) with `doneDate === date`.
- If 0 services were completed on that date, the date is **invalidated** — excluded from all
  employee lookback accumulation. (Per-date invalidation, not per-employee.)
- If the user-configured completion threshold > 0%: also invalidate dates where
  `completedCount / assignedCount < threshold`.

This logic lives in an isolated file (`employeeLookbackUtils.ts`) to make future refactoring
easy when `SkipReason` is added to `AssignmentDoc`.

### Step 2 — Accumulate per employee per programType

For each valid production day, for each finished service:
- Attribute `service.size * doneBy.percent` (or count/price equivalent) to the employee.
- Group by `employeeId` × `programType`.

Result: a map of `employeeId → programType → dailyProduction[]` (one entry per valid day).

### Step 3 — Compute max and average

From `dailyProduction[]`:
- `maxDailyCSP` — single highest day (per-dimension independently)
- `avgDailyCSP` — mean across all valid days

Both are `CountSizePrice | null` (null if no data in window).

---

## Capacity Allocation Model (Cascade)

Employees are processed in priority order per `servCode.assignedTo[]` (index 0 = highest).

For each employee in priority order:

1. Look up their `maxDailyCSP` for the servCode's `programType` from the lookback map.
2. Compute remaining capacity after higher-priority servCode allocations:
   `remainingCapacity = maxDailyCSP - sum(shareCSP for higher-priority servCodes)`
3. `shareCSP = min(remainingCapacity, servCode.unfinishedRate)` — capped at what's needed.
4. `fractionConsumed = shareCSP / maxDailyCSP` (per dimension, stored as `CountSizePrice`).

If `maxDailyCSP` is null (no lookback data), fall back to the current even-split behavior and
flag the share as estimated.

**`lookBackCSP` as the lens:** `LookbackConfig.lookBackCSP` is a `CountSizePrice` where each
field independently holds the "active lens value" for that dimension. Selectors compute
`fractionConsumed` for all three dimensions simultaneously. The UI displays whichever dimension
is most relevant in context.

---

## Type Changes

### `EmployeeShare` (in `PaceType.ts`)

```typescript
type EmployeeShare = {
  employee: Employee;
  expectedCSP: CountSizePrice;              // lookback-derived expected daily contribution (or even-split fallback)
  maxDailyCSP: CountSizePrice | null;
  avgDailyCSP: CountSizePrice | null;
  fractionConsumed: CountSizePrice | null;  // one fraction per dimension; null if no lookback data
  isEstimated: boolean;                     // true when falling back to even split
};
```

### `ServCodePace` (in `PaceType.ts`)

Add:
```typescript
teamExpectedCSP: CountSizePrice;     // sum of employeeShares[].expectedCSP
paceDelta: CountSizePrice;           // teamExpectedCSP - unfinishedRate
paceDeltaPct: CountSizePrice | null; // paceDelta / unfinishedRate per dimension (null if denominator is 0)
```

### New: `EmployeePaceSummary` (in `PaceType.ts`)

Cross-servCode view of a single employee's capacity state:

```typescript
type EmployeeAllocation = {
  servCode: ServCodeDeep;
  fractionConsumed: CountSizePrice | null;
  expectedCSP: CountSizePrice;
};

type EmployeePaceSummary = {
  employee: Employee;
  programType: string | null;
  maxDailyCSP: CountSizePrice | null;
  avgDailyCSP: CountSizePrice | null;
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
  isOverloaded: boolean;  // true if any dimension of totalFractionConsumed > 1.0
};
```

### New: `LookbackConfig` (in `PaceType.ts`)

```typescript
type LookbackConfig = {
  lookbackStart: string;          // ISO date — start of lookback window
  completionThreshold: number;    // 0.0–1.0; days below this fraction are excluded
  // lookBackCSP deferred — dimension-lens concept not implemented in this build
};
```

---

## State Changes

### `paceSlice.ts`

Add `lookbackConfig: LookbackConfig` to `PaceState` with sensible defaults:
- `lookbackStart`: start of current season (or `yearStart()`)
- `completionThreshold`: 0
- `lookBackCSP`: `{ count: 1, size: 1, price: 1, rev: 1 }` (all dimensions active)

Add individual setters: `setLookbackStart`, `setLookbackCompletionThreshold`,
`setLookbackCSP`.

---

## Selector Changes

### `paceSelect.ts`

New selectors:
- `selectLookbackConfig` — reads `state.pace.lookbackConfig`
- `selectEmployeeLookbackMap` — computes the
  `employeeId → programType → { maxDailyCSP, avgDailyCSP } | null` map from finished services
  within the lookback window
- `selectEmployeePaceSummaries` — cross-servCode capacity summaries per employee (uses
  `selectEmployeeLookbackMap` + `selectServCodePaces`)

Modified selectors:
- `selectServCodePaces` — uses `selectEmployeeLookbackMap` to populate `EmployeeShare` fields
  and the new `teamExpectedCSP`, `paceDelta`, `paceDeltaPct` fields on `ServCodePace`

---

## Component Tree

```
ServCodePaceCard (existing, enhanced)
  ├── pace delta / delta% display  ← new
  └── EmployeeShareRow (existing, enhanced)
        ├── overload warning indicator  ← new
        └── [click] → EmployeeDetailPopover  ← new

EmployeeDetailPopover (new)
  └── EmployeePaceDetail (new, reusable)
        ├── programType max / avg display
        ├── capacity bar (fractionConsumed per servCode)
        └── overload / free capacity summary

PaceDisplayConfig (existing)
  └── LookbackConfigSection (new section in popover)
        ├── lookback window input (date)
        └── completion threshold slider/input
```

---

## Isolated Files

The missed-day / completion-rate logic should live in a dedicated utility file:

**`src/app/bizPlan/pace/_lib/employeeLookbackUtils.ts`**

Exports pure functions:
- `getValidProductionDates(services, threshold)` — returns `Set<string>`
- `accumulateDailyProduction(services, validDates)` — returns the raw accumulation map
- `computeLookbackStats(dailyProductions)` — returns `{ maxDailyCSP, avgDailyCSP } | null`

This isolation means the `SkipReason` future extension only touches this file.

---

## Future Overhead (not in this build)

- **Standalone employee page** — requires its own selector flow (different filters/sorts). The
  `EmployeePaceDetail` component is designed to be reused there.
- **Timeline view** — groups `ServCode.assignedTo[][]` by date. Vertical layout per date showing
  servCodes and employees. Deferred.
- **`SkipReason` on `AssignmentDoc`** — explicit tracking of holidays, sick days, weather delays.
  Would replace the inferred invalidation logic in `employeeLookbackUtils.ts`.
- **All-seasons lookback** — special case for season-end evaluation / next-season planning using
  all loaded services regardless of season.

---

## File Map

| File | Change |
|---|---|
| `bizPlan/assignmentPlan/AssignmentPlanTypes.ts` | **Flipped** — `{ employeeId, servCodeIds[] }` |
| `bizPlan/assignmentPlan/api/AssignmentPlanModel.ts` | Schema updated |
| `bizPlan/assignmentPlan/api/route.ts` | Upsert handler updated |
| `bizPlan/assignmentPlan/assignmentPlanSlice.ts` | Deduplication keyed on `employeeId` |
| `bizPlan/assignmentPlan/assignmentPlanSelect.ts` | New inverted selector + `assignmentsByEmployeeId` |
| `realGreen/progServ/_lib/selectors/hydrateAssignedTo.ts` | Updated to accept `Map<string, string[]>` |
| `bizPlan/pace/components/AssignmentEditor.tsx` | Updated to use flipped API |
| `pace/PaceType.ts` | Add `EmployeeShare` fields; add `teamExpectedCSP`, `paceDelta`, `paceDeltaPct` to `ServCodePace`; add `EmployeePaceSummary`, `EmployeeAllocation`, `LookbackConfig` types |
| `pace/paceSlice.ts` | Add `lookbackConfig` to state + actions |
| `pace/paceSelect.ts` | Add `selectLookbackConfig`, `selectEmployeeLookbackMap`, `selectEmployeePaceSummaries`; update `selectServCodePaces` |
| `pace/_lib/employeeLookbackUtils.ts` | **New** — isolated pure functions |
| `pace/components/ServCodePaceCard.tsx` | Show pace delta/delta%; add overload indicator; wire click to popover |
| `pace/components/EmployeeDetailPopover.tsx` | **New** — popover wrapper |
| `pace/components/EmployeePaceDetail.tsx` | **New** — reusable employee detail content |
| `pace/components/PaceDisplayConfig.tsx` | Add `LookbackConfigSection` |
