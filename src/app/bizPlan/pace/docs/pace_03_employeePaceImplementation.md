# Pace — Employee Pace Implementation

## Extension Index: `pace_03`

**Reference:** See `pace_03_employeePacePlan.md` for design rationale.

All backend/data tasks are Y-tasks (human). All UI tasks are A-tasks (AI).

---

## Task List

---

### Y0 — Flip `AssignmentPlan` ✅ COMPLETE

**Files changed:**
- `AssignmentPlanTypes.ts` — flipped to `{ employeeId, servCodeIds[] }` (priority-ordered)
- `api/AssignmentPlanModel.ts` — schema updated
- `api/route.ts` — upsert handler uses `employeeId` / `servCodeIds`
- `assignmentPlanSlice.ts` — deduplication keyed on `employeeId`
- `assignmentPlanSelect.ts` — new `assignmentsByEmployeeId` + inverted `assignmentsByServCodeId`
  returning `Map<servCodeId, string[]>` in priority order
- `hydrateAssignedTo.ts` — updated to accept `Map<string, string[]>`
- `AssignmentEditor.tsx` — updated to use flipped API

`ServCode.assignedTo[]` order now carries meaning — index 0 = highest-priority employee.

---

### Y1 — `CountSizePriceOps`: Add `multiply` and `subtract` ✅ COMPLETE

**File:** `src/app/realGreen/customer/_lib/entities/types/CountSizePrice.ts`

```typescript
static multiply(a: CountSizePrice, factor: number): CountSizePrice {
  return {
    count: a.count * factor,
    size: a.size * factor,
    price: a.price * factor,
    rev: a.rev * factor,
  };
}

static subtract(a: CountSizePrice, b: CountSizePrice): CountSizePrice {
  return {
    count: a.count - b.count,
    size: a.size - b.size,
    price: a.price - b.price,
    rev: a.rev - b.rev,
  };
}
```

---

### Y2 — `PaceType.ts`: Add new types

**File:** `src/app/bizPlan/pace/PaceType.ts`

**`LookbackConfig`** — user-configurable lookback settings:
```typescript
type LookbackConfig = {
  lookbackStart: string;          // ISO date — start of lookback window
  completionThreshold: number;    // 0.0–1.0; days below this fraction are excluded
  // NOTE: lookBackCSP (dimension lens) was deferred — not implemented in this build.
};
```

**`EmployeeShare`** — add lookback fields:
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

**`ServCodePace`** — add team-level pace fields:
```typescript
// add to existing ServCodePace:
teamExpectedCSP: CountSizePrice;
paceDelta: CountSizePrice;
paceDeltaPct: CountSizePrice | null;  // null when any denominator dimension is 0
```

**`EmployeeAllocation`** and **`EmployeePaceSummary`** — new cross-servCode view:
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

---

### Y3 — `paceSlice.ts`: Add `lookbackConfig` state

**File:** `src/app/bizPlan/pace/paceSlice.ts`

Import `LookbackConfig` from `PaceType.ts`. Add to `PaceState` and `initialState`:

```typescript
// In PaceState:
lookbackConfig: LookbackConfig;

// In initialState:
lookbackConfig: {
  lookbackStart: dateStrings.yearStart(),
  completionThreshold: 0,
},

// Reducers:
setLookbackStart: (state, action: PayloadAction<string>) => {
  state.lookbackConfig.lookbackStart = action.payload;
},
setLookbackCompletionThreshold: (state, action: PayloadAction<number>) => {
  state.lookbackConfig.completionThreshold = action.payload;
},
```

Export `LookbackConfig` type from this file (re-export from `PaceType.ts`).

> **Note:** `setLookbackCSP` / `lookBackCSP` were deferred — not implemented in this build.

---

### Y4 — `employeeLookbackUtils.ts`: Isolated lookback pure functions

**File:** `src/app/bizPlan/pace/_lib/employeeLookbackUtils.ts`

This file is intentionally isolated — it is the only place that knows about the "missed day"
heuristic. When `SkipReason` is added to `AssignmentDoc` in the future, only this file changes.

Three pure functions:

**`getValidProductionDates`** — given all finished services and a threshold, returns the set of
dates that are valid for lookback accumulation:
```typescript
// A date is invalid if:
//   - 0 services were completed on it (completedCount === 0), OR
//   - completedCount / assignedCount < threshold (when threshold > 0)
// Invalidation is per-date only — not per employee, not per servCode.
// "completedCount" = services with doneDate === date and status === "S"
// "assignedCount" = services whose last AssignmentDoc.schedDate === date
function getValidProductionDates(
  services: Service[],
  threshold: number,
): Set<string>
```

**`accumulateDailyProduction`** — for each valid date, sums each employee's CSP contribution
grouped by `programType`:
```typescript
// Returns: Map<employeeId, Map<programType | "__null__", CountSizePrice[]>>
// Each entry in the inner array is one valid day's production total for that employee+programType.
// programType null is stored as "__null__" key to allow Map usage.
// Employee contribution per service:
//   CountSizePriceOps.multiply(CountSizePriceOps.fromService(service), doneBy.percent)
// Only services with doneDate within the lookback window and in validDates are included.
function accumulateDailyProduction(
  services: Service[],
  validDates: Set<string>,
): Map<string, Map<string, CountSizePrice[]>>
```

**`computeLookbackStats`** — derives max and average from a daily production array:
```typescript
// Returns null if dailyProductions is empty.
// max is computed per-unit independently (count max, size max, price max, rev max).
// avg is mean across all valid days.
function computeLookbackStats(
  dailyProductions: CountSizePrice[],
): { maxDailyCSP: CountSizePrice; avgDailyCSP: CountSizePrice } | null
```

---

### Y5 — `paceSelect.ts`: New and updated selectors

**File:** `src/app/bizPlan/pace/paceSelect.ts`

**New: `selectLookbackConfig`**
```typescript
const selectLookbackConfig = (state: AppState) => state.pace.lookbackConfig;
```

**New: `selectEmployeeLookbackMap`** — the core lookback computation:
```typescript
// Depends on: deepSelect.servCodes, selectLookbackConfig
// 1. Collect all finished services across all servCodes within the lookback window
//    (service.doneDate >= lookbackConfig.lookbackStart)
// 2. Call getValidProductionDates(services, completionThreshold)
// 3. Call accumulateDailyProduction(services, validDates)
// 4. For each entry, call computeLookbackStats(dailyProductions)
// Returns: Map<employeeId, Map<programType | "__null__", { maxDailyCSP, avgDailyCSP } | null>>
type EmployeeLookbackMap = Map<string, Map<string, { maxDailyCSP: CountSizePrice; avgDailyCSP: CountSizePrice } | null>>;
const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => { ... }
);
```

**Updated: `selectServCodePaces`** — add `selectEmployeeLookbackMap` as input:

Cascade model (per `servCode.assignedTo[]` in priority order):
- For each employee, look up their lookback stats for the servCode's `programType`
  (use `"__null__"` key when `programType` is null).
- Track `remainingCapacity` per employee across servCodes (starts at `maxDailyCSP`).
- `shareCSP = min(remainingCapacity, unfinishedRate)` per dimension.
- `fractionConsumed = shareCSP / maxDailyCSP` per dimension.
- If no lookback data: fall back to even split, set `isEstimated = true`.
- After all employees: compute `teamExpectedCSP`, `paceDelta`, `paceDeltaPct`.

**New: `selectEmployeePaceSummaries`** — cross-servCode capacity view:
```typescript
// Depends on: selectServCodePaces, selectEmployeeLookbackMap
// Groups all EmployeeShare entries across all ServCodePaces by employeeId.
// For each employee, finds their programType (from the servCode), looks up lookback stats,
// computes totalFractionConsumed (sum of fractionConsumed across all allocations),
// freeCapacityFraction = max(0, 1 - totalFractionConsumed) per dimension,
// isOverloaded = any dimension of totalFractionConsumed > 1.0.
// Returns: EmployeePaceSummary[]
const selectEmployeePaceSummaries = createSelector(
  [selectServCodePaces, selectEmployeeLookbackMap],
  (servCodePaces, lookbackMap): EmployeePaceSummary[] => { ... }
);
```

Export all new selectors on `paceSelect`.

---

### A1 — `PaceDisplayConfig.tsx`: Add `LookbackConfigSection`

**File:** `src/app/bizPlan/pace/components/PaceDisplayConfig.tsx`

Add a new "Lookback" section to the existing popover. Two controls:
- **Window start** — `DatePicker` for ISO date. Dispatches `setLookbackStart`.
  Label: "Lookback from".
- **Completion threshold** — numeric input (0–100, displayed as %). Dispatches
  `setLookbackCompletionThreshold` (divide by 100 before dispatch).
  Label: "Min day completion %".

Reads: `paceSelect.lookbackConfig` (via `useSelector`).

---

### A2 — `ServCodePaceCard.tsx`: Show pace delta + overload indicator

**File:** `src/app/bizPlan/pace/components/ServCodePaceCard.tsx`

Two additions:

1. **Pace delta row** — below the existing `unfinishedRate` display, show `paceDelta` and
   `paceDeltaPct`. Positive delta (team can exceed pace) = accent color. Negative delta (team
   falls short) = destructive color. Show "—" when `paceDeltaPct` is null.

2. **Employee row enhancement** — each employee row in the card:
   - Shows `shareCSP` (already shown, but now lookback-derived).
   - If `isEstimated`, show a small muted "~" prefix or "est." badge.
   - If the employee's `EmployeePaceSummary.isOverloaded`, show a warning icon (⚠).
   - Clicking the employee name opens `EmployeeDetailPopover`.

Reads: `paceSelect.employeePaceSummaries` (to check `isOverloaded` per employee).

---

### A3 — `EmployeeDetailPopover.tsx` + `EmployeePaceDetail.tsx`: New components

**Files:**
- `src/app/bizPlan/pace/components/EmployeeDetailPopover.tsx`
- `src/app/bizPlan/pace/components/EmployeePaceDetail.tsx`

**`EmployeeDetailPopover`** — thin wrapper: receives `employee: Employee` as prop, selects the
matching `EmployeePaceSummary` from `paceSelect.employeePaceSummaries`, renders a `Popover` with
`EmployeePaceDetail` as content.

**`EmployeePaceDetail`** — receives `summary: EmployeePaceSummary` as prop. Layout:
- Header: employee name + programType label
- Max / avg daily production row (all dimensions)
- Allocation list: one row per `EmployeeAllocation` showing servCode name, `fractionConsumed`
  as a percentage per dimension, and `shareCSP`
- Footer: total capacity consumed (as %) + free capacity (as %) per dimension.
  If `isOverloaded`, show overload warning in destructive color.
- If `maxDailyCSP` is null: show "No lookback data for this program type" message.

---

## Status Table

| Task | Owner | Status | Depends On |
|------|-------|--------|------------|
| Y0 — Flip AssignmentPlan | Human | COMPLETE | — |
| Y1 — CountSizePriceOps: add multiply + subtract | Human | COMPLETE | — |
| Y2 — PaceType.ts: new types | Human | COMPLETE | — |
| Y3 — paceSlice.ts: lookbackConfig state | Human | COMPLETE | Y2 |
| Y4 — employeeLookbackUtils.ts: pure lookback functions | Human | COMPLETE | Y1, Y2 |
| Y5 — paceSelect.ts: new + updated selectors | Human | COMPLETE | Y2, Y3, Y4 |
| A1 — PaceDisplayConfig.tsx: LookbackConfigSection | AI | COMPLETE | Y3 |
| A2 — ServCodePaceCard.tsx: pace delta + overload indicator | AI | COMPLETE | Y5 |
| A3 — EmployeeDetailPopover + EmployeePaceDetail | AI | COMPLETE | Y5 |

## Deviations from Plan

- **lookBackCSP / setLookbackCSP deferred** — the dimension-lens concept (selecting which CSP
  dimension drives the display) was not implemented. LookbackConfig has only `lookbackStart` and
  `completionThreshold`. Can be added as a future extension.
- **DoneByCore.percent normalization** — discovered during testing that RealGreen stores
  `percent` as an integer (0–100), not a fraction. Fixed in `remapDoneBy` by dividing by 100.
  The old `|| 1` fallback (which accidentally meant "100%") is now `(raw.percent ?? 100) / 100`.
