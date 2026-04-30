# Pace Plan

## Goal

A business planning tool that shows, by service code, whether the team is on pace to complete all scheduled services
within each service code's date range. Drill down to the individual employee level to identify who is ahead or behind,
and model "what-if" scenarios by adding fictional employees.

---

## Phase 1 — Data Foundation ✅ Complete

- **`ServCodeUtils`**: `daysPlanned: number` (total weekdays in `dateRange`), `daysRemaining: number` (weekdays from
  today to `dateRange.max`; clamps to 1 if past max, full count if before min), `daysElapsed: number` (weekdays from
  `dateRange.min` to today; clamps to 1 if before min)
- **`CountSizePrice` / `CountSizePriceOps`**: `{ count, size, price, rev }` value type with `fromService`, `sum`,
  `sumAll(items[])`, `divideBy`
- **`deepSelect`**: `selectServCodesDeep`, `selectServCodeDeepMap` — joins `ServCode[]` with `Service[]`
- **`dateStrings`**: `dateRangeToDate` added to `dateRanges` — inverse of `dateRangeFromDate`; clips range from min up
  to a given date

### `ServCodePace` type

```typescript
type PaceCategory = "asap" | "overdue" | "inProgress" | "notStarted" | "notSet";

type ServCodePace = {
  servCode: ServCodeDeep;
  category: PaceCategory;
  daysRemaining: number;
  unfinishedCSP: CountSizePrice;   // total remaining work
  unfinishedRate: CountSizePrice;  // remaining / daysRemaining (required daily pace)
  finishedCSP: CountSizePrice;     // total completed work
  finishedRate: CountSizePrice;    // completed / daysElapsed (actual daily pace so far)
}
```

### Category rules

| Category | Condition |
|---|---|
| `asap` | `servCode.alwaysAsap === true` |
| `notStarted` | valid `dateRange` and `dateRange.min > today` |
| `overdue` | valid `dateRange` and `dateRange.max < today` |
| `inProgress` | valid `dateRange` and `dateRange.min <= today <= dateRange.max` |
| `notSet` | invalid or missing `dateRange` |

---

## Phase 2 — Assignment Plan Data Module ✅ Complete

- **`AssignmentPlanTypes`**: `AssignmentPlan { servCodeId: string; employeeIds: string[] }` — serializable, complete, no
  hydration needed on its own shape
- **`AssignmentPlanModel`**: Mongoose schema for `AssignmentPlan`
- **`AssignmentPlanContract`**: Read + Upsert only. No explicit delete — upsert with empty `employeeIds` serves as a
  clear
- **`route.ts`**: `getAssignmentPlans` + `upsertAssignmentPlan` handlers with `cleanMongoObject`
- **`assignmentPlanSlice`**: Redux state (`assignmentPlans: AssignmentPlan[]`) + thunks
- **`assignmentPlanSelect`**: `assignmentsByServCodeId: Map<string, AssignmentPlan>`
- **`ServCodeProps.assignedTo: Employee[]`**: hydrated at `selectProgCodes` level in `progServSelect`
- **`hydrateAssignedTo.ts`**: resolves `employeeIds → Employee[]`; synthesizes dummy employee (
  `{ ...baseEmployee, employeeId: id, name: id, active: true }`) for unknown IDs (fictional employees)
- **`baseServCode`**: `assignedTo: []` default
- **`useAssignmentPlan`**: auto-fetch hook; integrated into `usePaceDeps`

---

## Phase 3 — `paceSelect` Implementation ✅ Complete

### `PaceType.ts`

Types extracted to their own file:
- `PaceCategory`: `"asap" | "overdue" | "inProgress" | "notStarted" | "notSet"`
- `ServCodePace`: full type as defined above

### `paceSelect` exports

- `paceSelect.servCodePaces: ServCodePace[]` — array form for rendering
- `paceSelect.servCodePaceMap: Map<string, ServCodePace>` — keyed by `servCodeId`

### Selector logic

For each `ServCodeDeep`:
1. Derive `category` via `getCategory()` helper (checks `alwaysAsap`, `dateRange` vs. today)
2. `daysRemaining = servCode.x.daysRemaining`
3. `finishedCSP = CountSizePriceOps.sumAll(finishedServices.map(fromService))`
4. `unfinishedCSP = CountSizePriceOps.sumAll(unfinishedServices.map(fromService))`
5. `finishedRate = divideBy(finishedCSP, servCode.x.daysElapsed)`
6. `unfinishedRate = divideBy(unfinishedCSP, daysRemaining)`

Finished services: `status === "S"`. Unfinished services: statuses `["printed", "active", "asap"]`.

---

## Phase 4 — UI 🔲 Next

### `paceSlice` additions

```typescript
type PaceSortMode = "byId" | "byDateRange";

// Add to PaceState:
sortMode: PaceSortMode;        // default: "byDateRange"
activeFilters: PaceCategory[]; // default: ["asap", "overdue", "inProgress"]
```

Actions: `setSortMode`, `setActiveFilters`

### Sort logic

- **`byId`**: alphabetical by `servCodeId`
- **`byDateRange`**: `asap` always first → sort by `dateRange.min` ascending → `notSet` last →
  secondary sort alphabetical by `servCodeId`

### Components

**`Pace.tsx`** (top level, rewrite):
- `usePaceDeps()`
- Renders `PaceListPanel` (left) + `PaceDetailPanel` (right, stub)
- Selects `sortMode`, `activeFilters` from `paceSlice`; dispatches actions

**`PaceListPanel.tsx`**:
- Receives `ServCodePace[]` (pre-sorted, pre-filtered)
- `ToggleGroup` (multi-select) for filter: `ASAP | Overdue | In Progress | Not Started | Not Set`
- `RadioGroup` (`variant="button-group"`) for sort: `By ID | By Date`
- Scrollable list of `PaceListItem` buttons

**`PaceListItem.tsx`**:
- Line 1: `{servCodeId}` — `{longName}` (monospace id, truncated name)
- Line 2 (subtle): date range badge · ASAP badge (if `asap`) · `{finishedCSP.count}/{finishedCSP.count + unfinishedCSP.count}` count (e.g. `62/100`)
- Selected state: `bg-primary/15 border-primary/30`

**`PaceDetailPanel.tsx`** (stub):
- Empty state placeholder when nothing selected
- Stub content when a `ServCodePace` is selected (to be fleshed out in a future phase)

---

## Future Phase — Employee Capacity

Deferred. Will add per-employee pace breakdown once the core ServCode-level UI is working.

---

## File Map

| File                                                     | Status             | Purpose                                     |
|----------------------------------------------------------|--------------------|---------------------------------------------|
| `bizPlan/pace/pacePlan.md`                               | ✅ This file        | Plan documentation                          |
| `bizPlan/pace/PaceType.ts`                               | ✅ Complete         | `PaceCategory`, `ServCodePace` types        |
| `bizPlan/pace/paceSelect.ts`                             | ✅ Complete         | `servCodePaces`, `servCodePaceMap`          |
| `bizPlan/pace/paceSlice.ts`                              | 🔲 Phase 4         | Add `sortMode`, `activeFilters`             |
| `bizPlan/pace/usePaceDeps.ts`                            | ✅ Complete         | Loads all deps incl. assignment plans       |
| `bizPlan/pace/Pace.tsx`                                  | 🔲 Phase 4         | Top-level layout: list panel + detail panel |
| `bizPlan/pace/PaceListPanel.tsx`                         | 🔲 Phase 4         | Filter/sort controls + list of items        |
| `bizPlan/pace/PaceListItem.tsx`                          | 🔲 Phase 4         | Single row: id, name, date range, count     |
| `bizPlan/pace/PaceDetailPanel.tsx`                       | 🔲 Phase 4         | Stub detail panel                           |
| `bizPlan/assignmentPlan/AssignmentPlanTypes.ts`          | ✅ Complete         | `AssignmentPlan` type                       |
| `bizPlan/assignmentPlan/assignmentPlanSlice.ts`          | ✅ Complete         | Redux slice + thunks                        |
| `bizPlan/assignmentPlan/assignmentPlanSelect.ts`         | ✅ Complete         | `assignmentsByServCodeId`                   |
| `bizPlan/assignmentPlan/useAssignmentPlan.ts`            | ✅ Complete         | Auto-fetch hook                             |
| `bizPlan/assignmentPlan/api/AssignmentPlanContract.ts`   | ✅ Complete         | API contract                                |
| `bizPlan/assignmentPlan/api/AssignmentPlanModel.ts`      | ✅ Complete         | Mongoose model                              |
| `bizPlan/assignmentPlan/api/route.ts`                    | ✅ Complete         | API route handler                           |
| `realGreen/progServ/_lib/types/ServCodeTypes.ts`         | ✅ Complete         | `assignedTo: Employee[]` in `ServCodeProps` |
| `realGreen/progServ/_lib/baseServCode.ts`                | ✅ Complete         | `assignedTo: []` default                    |
| `realGreen/progServ/_lib/selectors/hydrateAssignedTo.ts` | ✅ Complete         | Dummy employee fallback                     |
| `realGreen/progServ/_lib/selectors/progServSelect.ts`    | ✅ Complete         | Hydrates `assignedTo` at `selectProgCodes`  |
| `realGreen/deepSelect.ts`                                | ✅ Complete         | No changes needed                           |
| `realGreen/progServ/_lib/classes/ServCodeUtils.ts`       | ✅ Complete         | `daysPlanned`, `daysRemaining`, `daysElapsed` |
| `lib/primatives/dates/dateStrings.ts`                    | ✅ Complete         | `dateRangeToDate` added to `dateRanges`     |
