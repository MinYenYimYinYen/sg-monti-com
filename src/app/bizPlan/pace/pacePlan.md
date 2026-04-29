# Pace Plan

## Goal

A business planning tool that shows, by service code, whether the team is on pace to complete all scheduled services within each service code's date range. Drill down to the individual employee level to identify who is ahead or behind, and model "what-if" scenarios by adding fictional employees.

---

## Phase 1 — Data Foundation ✅ Complete

- **`ServCodeUtils`**: `weekDays: string[]` (all Mon–Fri in `dateRange`), `daysRemaining: number` (weekdays from today to `dateRange.max`; clamps to 1 if past max, full count if before min)
- **`CountSizePrice` / `CountSizePriceOps`**: `{ count, size, price, rev }` value type with `fromService`, `sum`, `sumAll(items[])`, `divideBy`
- **`deepSelect`**: `selectServCodesDeep`, `selectServCodeDeepMap` — joins `ServCode[]` with `Service[]`
- **`paceSelect`**: `selectServCodePaceMap: Map<string, ServCodePace>`, `selectServCodePaceRows: ServCodePace[]`
- **`paceSlice`**: `selectedDateRange: TRange<string>` (lookback window for capacity calculation)

### `ServCodePace` type (Phase 1)
```typescript
type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  unfinishedCSP: CountSizePrice;   // total remaining work
  unfinishedRate: CountSizePrice;  // remaining / daysRemaining (required daily pace)
  finishedCSP: CountSizePrice;     // total completed work
  finishedRate: CountSizePrice;    // completed / totalWeekdays (historical daily rate)
}
```

---

## Phase 2 — Assignment Plan Data Module ✅ Complete

- **`AssignmentPlanTypes`**: `AssignmentPlan { servCodeId: string; employeeIds: string[] }` — serializable, complete, no hydration needed on its own shape
- **`AssignmentPlanModel`**: Mongoose schema for `AssignmentPlan`
- **`AssignmentPlanContract`**: Read + Upsert only. No explicit delete — upsert with empty `employeeIds` serves as a clear
- **`route.ts`**: `getAssignmentPlans` + `upsertAssignmentPlan` handlers with `cleanMongoObject`
- **`assignmentPlanSlice`**: Redux state (`assignmentPlans: AssignmentPlan[]`) + thunks
- **`assignmentPlanSelect`**: `assignmentsByServCodeId: Map<string, AssignmentPlan>`
- **`ServCodeProps.assignedTo: Employee[]`**: hydrated at `selectProgCodes` level in `progServSelect`
- **`hydrateAssignedTo.ts`**: resolves `employeeIds → Employee[]`; synthesizes dummy employee (`{ ...baseEmployee, employeeId: id, name: id, active: true }`) for unknown IDs (fictional employees)
- **`baseServCode`**: `assignedTo: []` default

---

## Phase 3 — Employee Capacity Selectors 🔲 Next

### `paceSlice` additions
```typescript
minProductiveServices: number;  // threshold to qualify a day as "productive" (default: 3)
```
Action: `setMinProductiveServices`

### `paceSelect` amendments

Add to `selectServCodePaceMap` inputs:
- `paceSlice.selectedDateRange` (lookback window)
- `paceSlice.minProductiveServices`

Add to `ServCodePace`:
```typescript
employeePaces: EmployeePace[];
```

### `EmployeePace` type
```typescript
type EmployeePace = {
  employee: Employee;
  finishedCSP: CountSizePrice;       // what they've actually done on this servCode
  capacityRate: CountSizePrice;      // their per-day capacity
  requiredRate: CountSizePrice;      // their share of unfinishedCSP / daysRemaining
  delta: CountSizePrice;             // capacityRate - requiredRate (positive = ahead of pace)
}
```

### Employee capacity rate algorithm

1. Collect all services completed by the employee within `selectedDateRange`
2. Group by `doneDate` → `CountSizePrice` per day
3. Filter out days where `count < minProductiveServices` (removes rain days, sick days, partial days)
4. Average the remaining days → **capacity rate**
5. Employees with no qualifying days → use **average capacity rate of employees who do have data** as proxy
6. If no employees have data → fall back to even distribution of `unfinishedCSP / assignedTo.length`

This degrades gracefully: all-new team → even distribution. Mixed team → real data where available, proxy for the rest.

---

## Phase 4 — `useAssignmentPlan` Hook 🔲

- Auto-fetch hook: dispatches `getAssignmentPlans` on mount
- Added to `usePaceDeps` so the Pace page loads assignment data automatically
- Also usable standalone (without `autoLoad`) to expose `upsertAssignmentPlan` for CRUD

---

## Phase 5 — UI 🔲

**`Pace.tsx`** (top level):
- `usePaceDeps()` (includes `useAssignmentPlan`)
- `DateRangePicker` bound to `paceSlice.selectedDateRange`
- `minProductiveServices` number input bound to `paceSlice.minProductiveServices`

**`PaceTable.tsx`**:
- One row per `ServCodePace`, sorted by `servCodeId`
- Columns: ServCode name | Days Remaining | Unfinished (count/size/rev) | Required Daily Rate | Actual Daily Rate | Delta
- Expandable row → `EmployeePaceRow` per assigned employee

**`EmployeePaceRow.tsx`**:
- Employee name | Finished CSP | Capacity Rate | Required Rate | Delta
- Color: green = ahead, amber = slightly behind, red = significantly behind

**Assignment management** (inline in `PaceTable`):
- Add/remove real employees per servCode via `upsertAssignmentPlan`
- "Add Fictional Employee" → adds `FNG-N` ID to `employeeIds`; synthesized as dummy employee at hydration time

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `bizPlan/pace/pacePlan.md` | ✅ This file | Plan documentation |
| `bizPlan/pace/paceSelect.ts` | ✅ Phase 1 complete | Needs Phase 3 employee amendments |
| `bizPlan/pace/paceSlice.ts` | ✅ Partial | Needs `minProductiveServices` (Phase 3) |
| `bizPlan/pace/usePaceDeps.ts` | ✅ Exists | Needs `useAssignmentPlan` added (Phase 4) |
| `bizPlan/pace/Pace.tsx` | 🔲 Phase 5 | Top-level component |
| `bizPlan/pace/PaceTable.tsx` | 🔲 Phase 5 | ServCode-level pace table |
| `bizPlan/pace/EmployeePaceRow.tsx` | 🔲 Phase 5 | Per-employee expandable row |
| `bizPlan/assignmentPlan/AssignmentPlanTypes.ts` | ✅ Complete | `AssignmentPlan` type |
| `bizPlan/assignmentPlan/assignmentPlanSlice.ts` | ✅ Complete | Redux slice + thunks |
| `bizPlan/assignmentPlan/assignmentPlanSelect.ts` | ✅ Complete | `assignmentsByServCodeId` |
| `bizPlan/assignmentPlan/useAssignmentPlan.ts` | 🔲 Phase 4 | Auto-fetch hook + CRUD actions |
| `bizPlan/assignmentPlan/api/AssignmentPlanContract.ts` | ✅ Complete | API contract |
| `bizPlan/assignmentPlan/api/AssignmentPlanModel.ts` | ✅ Complete | Mongoose model |
| `bizPlan/assignmentPlan/api/route.ts` | ✅ Complete | API route handler |
| `realGreen/progServ/_lib/types/ServCodeTypes.ts` | ✅ Complete | `assignedTo: Employee[]` in `ServCodeProps` |
| `realGreen/progServ/_lib/baseServCode.ts` | ✅ Complete | `assignedTo: []` default |
| `realGreen/progServ/_lib/selectors/hydrateAssignedTo.ts` | ✅ Complete | Dummy employee fallback |
| `realGreen/progServ/_lib/selectors/progServSelect.ts` | ✅ Complete | Hydrates `assignedTo` at `selectProgCodes` |
| `realGreen/deepSelect.ts` | ✅ Complete | No changes needed |
| `realGreen/progServ/_lib/classes/ServCodeUtils.ts` | ✅ Complete | `weekDays`, `daysRemaining` |
