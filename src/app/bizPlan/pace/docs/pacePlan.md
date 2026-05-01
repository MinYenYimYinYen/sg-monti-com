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

## Phase 4 — UI ✅ Complete (see `pace_01_progCodeGroupingPlan.md` and `pace_01_progCodeGroupingImplementation.md`)

### Overview

The list panel groups service codes by **`ProgCode`** rather than displaying them as a flat list. Each `ProgCodePace`
item in the list represents a program; selecting it populates the detail pane with one `ServCodePaceCard` per service
code in that program. A special **"All In Progress"** item at the top of the list selects all currently `inProgress`
service codes across all programs.

---

### New Type: `ProgCodePace` (in `PaceType.ts`)

> **Deviation**: Plan used `totalUnfinishedCSP` / `totalFinishedCSP`. Implemented as `unfinishedCSP` / `finishedCSP`
> (no `total` prefix) — semantically unnecessary given the type name already implies aggregation.

```typescript
type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];  // all servCodes in this progCode, in natural order
  category: PaceCategory;        // most urgent category among servCodePaces
  unfinishedCSP: CountSizePrice; // sum across all servCodePaces
  finishedCSP: CountSizePrice;   // sum across all servCodePaces
};
```

**Category urgency order** (most urgent wins): `asap` > `overdue` > `inProgress` > `notStarted` > `notSet`

---

### `paceSlice` — Updated State Shape

```typescript
type PaceSelectionSource = "progCode" | "allInProgress" | "none";

type PaceState = {
  sortMode: PaceSortMode;
  activeFilters: PaceCategory[];
  unfinishedOnly: boolean;
  selectedServCodeIds: string[];        // the actual set used by the detail pane
  selectionSource: PaceSelectionSource; // tracks which list item is highlighted
  selectedProgCodeId: string | null;    // which progCode is highlighted (when source === "progCode")
};
```

**Actions**:
- `setSortMode(PaceSortMode)`
- `setActiveFilters(PaceCategory[])`
- `setUnfinishedOnly(boolean)`
- `setSelectedServCodeIds(string[])` — replaces `setSelectedServCodeId`
- `setSelectionSource(PaceSelectionSource)`
- `setSelectedProgCodeId(string | null)`

In practice, the list panel dispatches all three selection fields together when the user clicks an item.

---

### `paceSelect` — New Selectors

- **`selectProgCodePaces: ProgCodePace[]`** — groups `ServCodePace[]` by `progCodeId` using `progServSelect.progCodes`
  as the source of truth for ordering and membership
- **`selectFilteredSortedProgCodePaces: ProgCodePace[]`** — filters and sorts at the progCode level:
  - **Filter**: a `ProgCodePace` passes if at least one of its `servCodePaces` has a `category` in `activeFilters`
  - **`unfinishedOnly`**: a `ProgCodePace` passes if at least one `servCodePace` has `unfinishedCSP.count > 0`
  - **Sort `byId`**: alphabetical by `progCodeId`
  - **Sort `byDateRange`**: `asap` first → sort by earliest `dateRange.min` among servCodes → `notSet` last →
    secondary alphabetical by `progCodeId`
- **`selectInProgressServCodeIds: string[]`** — all `servCodePaces` with `category === "inProgress"`, mapped to ids;
  used by the "All In Progress" button to populate `selectedServCodeIds`
- **`selectSelectedPaces: ServCodePace[]`** — looks up each id in `servCodePaceMap`; used by the detail pane

---

### Category Color Map (shared const)

Defined in `bizPlan/pace/paceStyles.ts` (new file):

```typescript
export const CATEGORY_BADGE_STYLES: Record<PaceCategory, string> = {
  asap:       "bg-destructive/30 text-destructive",
  overdue:    "bg-secondary/30 text-secondary",
  inProgress: "bg-primary/20 text-primary",
  notStarted: "bg-accent/20 text-accent-foreground",
  notSet:     "bg-muted/30 text-muted-foreground",
};
```

---

### Components

**`Pace.tsx`** (top level, rewrite):
- `usePaceDeps()`
- Renders `PaceListPanel` (left) + `PaceDetailPanel` (right)

**`PaceListPanel.tsx`** (rewrite):
- Controls: `ToggleGroup` for category filter, `Switch` for unfinished-only, `RadioGroup` for sort
- Top of list: **"All In Progress"** pseudo-item (`ProgCodePaceItem` shape)
  - On click: dispatches `setSelectedServCodeIds(inProgressIds)`, `setSelectionSource("allInProgress")`,
    `setSelectedProgCodeId(null)`
  - Highlighted when `selectionSource === "allInProgress"`
- Remaining list: `ProgCodePaceItem` per `ProgCodePace` from `selectFilteredSortedProgCodePaces`
  - On click: dispatches `setSelectedServCodeIds(progCodePace.servCodePaces.map(p => p.servCode.servCodeId))`,
    `setSelectionSource("progCode")`, `setSelectedProgCodeId(progCodeId)`
  - Highlighted when `selectionSource === "progCode" && selectedProgCodeId === progCode.progCodeId`

**`ProgCodePaceItem.tsx`** (new, replaces `PaceListItem`):
- Line 1: `{progCodeId}` (monospace) — `{description}` (truncated)
- Line 2: small badges for each `servCodeId`, color-coded by that servCode's `category` via `CATEGORY_BADGE_STYLES`
- Line 3 (subtle): aggregate `totalFinishedCSP.count / (totalFinishedCSP.count + totalUnfinishedCSP.count)`
- Selected state: `bg-primary/15 border-primary/30`

**`PaceDetailPanel.tsx`** (rewrite):
- Selects `paceSelect.selectedPaces: ServCodePace[]`
- Applies `unfinishedOnly` filter: if `unfinishedOnly`, only renders cards where `unfinishedCSP.count > 0`
- Renders one `ServCodePaceCard` per passing `ServCodePace`, in order
- Empty state (nothing selected): dashed border placeholder
- Empty state (all filtered out): "All service codes are complete" message

**`ServCodePaceCard.tsx`** (new):
- Receives a single `ServCodePace`
- Card wrapper containing: `ServCodeHeader`, `DateRangeEditor`, `PaceRateDisplay`, `AssignmentEditor`
- See `paceDetailPlan.md` for sub-component specs

---

## Future Phase — Employee Capacity

Deferred. Will add per-employee pace breakdown once the core ServCode-level UI is working.

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `bizPlan/pace/pacePlan.md` | ✅ This file | Plan documentation |
| `bizPlan/pace/PaceType.ts` | ✅ Complete | Add `ProgCodePace`, `EmployeeShare`; extend `ServCodePace` |
| `bizPlan/pace/paceStyles.ts` | ✅ Complete | `CATEGORY_BADGE_STYLES` const |
| `bizPlan/pace/paceSelect.ts` | ✅ Complete | Added 4 new selectors; updated `selectServCodePaces` |
| `bizPlan/pace/paceSlice.ts` | ✅ Complete | Replaced `selectedServCodeId` → `selectedServCodeIds`, added `selectionSource`, `selectedProgCodeId` |
| `bizPlan/pace/usePaceDeps.ts` | ✅ Complete | Loads all deps incl. assignment plans |
| `bizPlan/pace/components/Pace.tsx` | ✅ Complete | Top-level layout (no changes needed) |
| `bizPlan/pace/components/PaceListPanel.tsx` | ✅ Complete | ProgCode grouping + "All In Progress" item |
| `bizPlan/pace/components/PaceListItem.tsx` | ✅ Removed | Replaced by `ProgCodePaceItem` |
| `bizPlan/pace/components/ProgCodePaceItem.tsx` | ✅ Complete | ProgCode list row with badges |
| `bizPlan/pace/components/PaceDetailPanel.tsx` | ✅ Complete | Renders `ServCodePaceCard[]` filtered by `unfinishedOnly` |
| `bizPlan/pace/components/ServCodePaceCard.tsx` | ✅ Complete | Card wrapper for a single `ServCodePace` |
| `bizPlan/pace/components/ServCodeHeader.tsx` | ✅ Complete | Identity display |
| `bizPlan/pace/components/DateRangeEditor.tsx` | ✅ Complete | Date range display + edit + save |
| `bizPlan/pace/components/PaceRateDisplay.tsx` | ✅ Complete | Required daily pace display |
| `bizPlan/pace/components/AssignmentEditor.tsx` | ✅ Complete | Employee assignment list + add/remove |
| `bizPlan/pace/components/EmployeePaceRow.tsx` | ✅ Complete | Single employee row with share CSP |
| `bizPlan/assignmentPlan/AssignmentPlanTypes.ts` | ✅ Complete | `AssignmentPlan` type |
| `bizPlan/assignmentPlan/assignmentPlanSlice.ts` | ✅ Complete | Redux slice + thunks |
| `bizPlan/assignmentPlan/assignmentPlanSelect.ts` | ✅ Complete | `assignmentsByServCodeId` |
| `bizPlan/assignmentPlan/useAssignmentPlan.ts` | ✅ Complete | Auto-fetch hook |
| `bizPlan/assignmentPlan/api/AssignmentPlanContract.ts` | ✅ Complete | API contract |
| `bizPlan/assignmentPlan/api/AssignmentPlanModel.ts` | ✅ Complete | Mongoose model |
| `bizPlan/assignmentPlan/api/route.ts` | ✅ Complete | API route handler |
| `realGreen/progServ/_lib/types/ServCodeTypes.ts` | ✅ Complete | `assignedTo: Employee[]` in `ServCodeProps` |
| `realGreen/progServ/_lib/baseServCode.ts` | ✅ Complete | `assignedTo: []` default |
| `realGreen/progServ/_lib/selectors/hydrateAssignedTo.ts` | ✅ Complete | Dummy employee fallback |
| `realGreen/progServ/_lib/selectors/progServSelect.ts` | ✅ Complete | Hydrates `assignedTo` at `selectProgCodes` |
| `realGreen/deepSelect.ts` | ✅ Complete | No changes needed |
| `realGreen/progServ/_lib/classes/ServCodeUtils.ts` | ✅ Complete | `daysPlanned`, `daysRemaining`, `daysElapsed` |
| `lib/primatives/dates/dateStrings.ts` | ✅ Complete | `dateRangeToDate` added to `dateRanges` |
