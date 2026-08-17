# Productivity Module Plan

## Objective

The Productivity module answers: *"For a given date range, how did each employee perform against their assignments, and how long did it take them?"*

It is a **read-and-report** module — no backend API of its own. It composes data from three existing pipelines:

| Source | What it provides |
|---|---|
| Active customers (services) | Completed services, revenue, size, `doneBys` attribution |
| Assignments | What was *planned* — used to compute completion % |
| TimeCard (punches) | How long it took — labor hours per employee per day |

The core metrics are:
- **Production totals** (count, size, revenue) — attributed to employees via `production.doneBys`
- **Completion %** — completed services vs. assigned services per employee per date
- **Labor hours** — punch data per employee for the date range (absent for salaried employees)

All computation is client-side. No new API route is needed for the productivity module itself, though the Assignment contract requires a date-range extension (see Phase 0).

---

## Phase 0 — Assignment Contract Extension

The existing `AssignmentContract` only supports single-date queries. Productivity needs assignments across a date range.

### `AssignmentContract.ts`
Add:
```typescript
getBySchedDateRange: {
  params: { dateRange: TRange<string> };
  result: DataResponse<AssignmentDoc[]>;
};
```

### `assignment/api/route.ts`
Add handler for `getBySchedDateRange`:
- Roles: `["admin", "office", "tech"]`
- Query: `{ schedDate: { $gte: dateRange.min, $lte: dateRange.max } }`
- Return `cleanMongoArray(docs)`

### `assignmentSlice.ts`
- Add thunk: `getBySchedDateRange` via `createStandardThunk`
- Add state field: `bySchedDateRange: AssignmentDoc[]`
- `extraReducers`: on fulfilled, set `state.bySchedDateRange`

### `assignmentSelect.ts`
- Add `selectBySchedDateRange` base selector
- Add `selectServIdsByEmployeeForRange` — `Map<employeeId, AssignmentDoc[]>` grouped from `bySchedDateRange`

---

## Phase 1 — Production Fallback

Completed services (`status === "S"`) should always have production data. In practice, `productionCore` can be null if the service was posted without production details. Rather than scattering null checks throughout the productivity selectors, we enforce the invariant at the hydration layer.

### `src/app/productivity/completedServiceProductionFallback.ts`

Exports a single function:

```typescript
function getProductionOrFallback({
  service,
  employeeMap,
  serviceConditions,
}: {
  service: Omit<Service, "x">;
  employeeMap: Map<string, Employee>;
  serviceConditions: ServiceCondition[];
}): Production | null
```

- If `service.production !== null`, returns it unchanged.
- If `service.status === "S"` and `service.production === null`, synthesizes a base `Production`:
  - Single `DoneBy` with `baseEmployee` (percent: 1.0)
  - Empty `usedAppProducts`, zero numeric fields
  - `doneDate: ""` (signals unattributed in UI)
- Otherwise (non-completed service with no production), returns `null` — no change to existing behavior.

### `centralSelectors.ts` (one-line change)

In `makeCustomersSelector`, when building the `serviceBuilder`, replace the direct `production` assignment with a call to `getProductionOrFallback`. The rest of the selector is untouched.

```typescript
// Before:
production: hydrateProduction({ ... }),

// After:
production: getProductionOrFallback({
  service: { ...servDoc, production: hydrateProduction({ ... }) },
  employeeMap,
  serviceConditions: ...,
}),
```

> **Note**: `getProductionOrFallback` wraps `hydrateProduction` — it does not replace it. `hydrateProduction` still runs first; the fallback only activates when the result is null and status is "S".

---

## Phase 2 — Redux Slice (`productivitySlice.ts`)

Location: `src/app/productivity/productivitySlice.ts`

```typescript
type ProductivityState = {
  doneDateRange: TRange<string>;
  // Additional state fields to be added as the module grows
};

const initialState: ProductivityState = {
  doneDateRange: { min: "", max: "" },
};
```

Actions:
- `setDoneDateRange(state, action: PayloadAction<TRange<string>>)`

No thunks — all data comes from existing pipelines.

Register in `src/store/reducers/index.ts`:
```typescript
productivity: productivityReducer,
```

---

## Phase 3 — Selectors (`productivitySelect.ts`)

Location: `src/app/productivity/productivitySelect.ts`

### `ProductivityTotals` Type

```typescript
type ProductivityTotals = {
  /** 1 per service per employee who touched it — "how many stops did this tech make?" */
  wholeCount: number;
  /** sum of percent per doneBy — "how much of each service did this tech own?" */
  fractionalCount: number;
  /** service.size * percent */
  size: number;
  /** service.x.getPriceAfterDiscounts("price") * percent */
  revenue: number;
};
```

Both count variants are needed: `wholeCount` for stop-level analysis, `fractionalCount` for accurate per-service averages (avoids skew when services are split between employees).

### Selectors

**Source selectors:**
- `selectDoneDateRange` — `state.productivity.doneDateRange`
- `selectCompletedServices` — `centralSelect.services` filtered to `status === "S"` and `service.x.doneDate` within `doneDateRange`

**Production totals (attributed via `doneBys`):**
- `selectTotals` — aggregate `ProductivityTotals` across all completed services
- `selectByEmployee` — `Map<employeeId, ProductivityTotals>`
- `selectByEmployeeByDate` — `Map<employeeId, Map<doneDate, ProductivityTotals>>`
- `selectByDateByEmployee` — `Map<doneDate, Map<employeeId, ProductivityTotals>>`

The `byEmployeeByDate` and `byDateByEmployee` maps contain the same data with different nesting — both are derived from the same intermediate computation for UI convenience.

**Assignment completion:**
- `selectAssignmentCompletionByEmployee` — `Map<employeeId, { assigned: number; completed: number; pct: number }>`
  - `assigned`: count of `AssignmentDoc` in `bySchedDateRange` for this employee
  - `completed`: count of completed services where `doneBys` includes this employee and `doneDate` matches `schedDate`
  - `pct`: `completed / assigned` (0 when assigned is 0)

**Labor hours:**
- `selectLaborByEmployee` — `Map<employeeId, { totalMinutes: number; regularMinutes: number; overtimeMinutes: number }>`
  - Sources from `timeCardSelect.byEmployee` (already a `Map<employeeId, Punch[]>`)
  - For each employee, instantiates `new TimeCard(punches)` to get minute totals
  - Employees with no punches (salaried) are absent from the map — callers handle with `?? null`

---

## Phase 4 — Hook (`useProductivity.ts`)

Location: `src/app/productivity/useProductivity.ts`

```typescript
export function useProductivity() {
  useActiveCustomers({ autoLoad: true });
  useCustomerContext({ contexts: ["active"] });

  const dispatch = useAppDispatch();
  const doneDateRange = useSelector(productivitySelect.doneDateRange);
  const isValidRange = dateRanges.isValidDateRange(doneDateRange);

  useEffect(() => {
    if (!isValidRange) return;
    dispatch(assignmentActions.getBySchedDateRange({
      params: { dateRange: doneDateRange },
      config: { loadingMsg: "Loading assignments..." },
    }));
  }, [dispatch, doneDateRange, isValidRange]);

  useTimeCard({ dateRange: isValidRange ? doneDateRange : undefined });
}
```

The hook is responsible for triggering all three data pipelines. Components call `useProductivity()` once at the page level and then select data directly.

---

## Phase 5 — Register Slice

In `src/store/reducers/index.ts`:
- Import `productivityReducer` from `@/app/productivity/productivitySlice`
- Add `productivity: productivityReducer` to `combineReducers`

---

## Phase 6 — UI (Deferred)

UI components are not part of this implementation pass. The module is complete when the hook, selectors, and slice are in place and the assignment contract extension is functional.

Anticipated UI entry point: `/productivity` page with:
- Date range picker → dispatches `setDoneDateRange`
- Employee summary table (production totals + completion % + labor hours)
- Per-employee drill-down (by date)

---

## File Structure

```
src/app/productivity/
  productivityPlan.md              ← This document
  productivitySlice.ts             ← Redux slice (doneDateRange state)
  productivitySelect.ts            ← Selectors (totals, by-employee, by-date)
  useProductivity.ts               ← Hook (orchestrates all three pipelines)
  completedServiceProductionFallback.ts  ← Isolated fallback for null production

src/app/assignment/
  AssignmentTypes.ts               ← No change
  assignmentSlice.ts               ← Add getBySchedDateRange thunk + state
  assignmentSelect.ts              ← Add selectBySchedDateRange selectors
  api/
    AssignmentContract.ts          ← Add getBySchedDateRange operation
    route.ts                       ← Add getBySchedDateRange handler

src/app/realGreen/customer/selectors/
  centralSelectors.ts              ← One-line change: call getProductionOrFallback
```

---

## Key Conventions

- **No manual memoization** — React Compiler handles this; do not use `useCallback`/`useMemo`
- **Selectors select, hooks dispatch** — components use `useSelector(productivitySelect.x)` directly
- **`doneBys` is the attribution source of truth** — not assignments; assignments are the *plan*, `doneBys` is *reality*
- **Salaried employees** have no punch data — `selectLaborByEmployee` returns absent entries (not zero); UI handles gracefully
- **`wholeCount` vs `fractionalCount`** — always expose both; never silently pick one
