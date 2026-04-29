# Pace Plan

## Goal

A business planning tool that shows, by service code, whether the team is on pace to complete all scheduled services within each service code's date range. Drill down to the individual employee level to identify who is ahead or behind, and model "what-if" scenarios by adding fictional employees.

---

## Current State (Completed)

### Data Foundation
- **`deepSelect.ts`** — `selectServCodesDeep` / `selectServCodeDeepMap`: cross-domain selector that joins `progServSelect.servCodes` with `centralSelect.services`, producing `ServCodeDeep[]` (each `ServCode` with its hydrated `Service[]`).
- **`ServCodeUtils`** — `weekDays: string[]` (all Mon–Fri dates in `dateRange`), `daysRemaining: number` (weekdays from today to `dateRange.max`; if past max returns 1 to avoid divide-by-zero; if before min returns full weekday count).
- **`dateStrings`** — `isWeekDay`, `nextMonday`, `addDays`, `isInRange`, etc.
- **`CountSizePrice` / `CountSizePriceOps`** — `{ count, size, price, rev }` value type with `fromService`, `sum`, `sumAll`, `divideBy` static ops.
- **`paceSelect.ts`** — `selectServCodePaceMap: Map<string, ServCodePace>` and `selectServCodePaceRows: ServCodePace[]`.

### `ServCodePace` type (current)
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

## Next Phase: Employee-Level Pace

### 1. `pacePlan` Data Module

Persists employee-to-servCode assignments and fictional employees in MongoDB.

**Types** (`bizPlan/pace/pacePlanTypes.ts`):
```typescript
type PacePlanDoc = {
  servCodeId: string;
  assignedEmployeeIds: string[];  // real employeeIds + FNG IDs ("FNG-1", "FNG-2", ...)
}

type FictionalEmployee = {
  fngId: string;   // "FNG-1", "FNG-2", etc.
  name: string;    // e.g., "New Hire 1"
}
```

**Redux state** (`bizPlan/pace/pacePlanSlice.ts`):
```typescript
{
  pacePlanDocs: PacePlanDoc[];
  fictionalEmployees: FictionalEmployee[];
}
```

**API**: Full CRUD where Create + Update are handled by upsert (keyed on `servCodeId`).

**`pacePlanSelect.ts`** exposes:
- `assignedEmployeeIdsByServCode: Map<string, string[]>` — raw FK map
- `fictionalEmployeeMap: Map<string, Employee>` — FNG IDs hydrated via `{ ...baseEmployee, employeeId: fng.fngId, name: fng.name }`

**`usePacePlan`** hook: `autoLoad: true` in `usePaceDeps`. Used elsewhere without `autoLoad` to expose CRUD actions.

---

### 2. `ServCodeProps` amendment

Add `assignedTo: Employee[]` to `ServCodeProps` (and therefore `ServCode`, `ServCodeDeep`).

**Hydration in `progServSelect`**: `selectProgCodes` gains two new inputs:
- `pacePlanSelect.assignedEmployeeIdsByServCode`
- `employeeSelect.employeeMap` (merged with `pacePlanSelect.fictionalEmployeeMap`)

When building each `ServCode`, look up `assignedTo` from the assignment map and resolve `Employee[]` from the merged employee map. Defaults to `[]` if no assignment exists.

> Rationale: `ServCode.assignedTo` will be `[]` for any component that doesn't load `pacePlan` data — it is inert and ignored. This keeps the type consistent without requiring a separate hydration layer.

---

### 3. `paceSelect` amendments

#### `ServCodePace` additions
```typescript
finishedByEmployee: Map<string, CountSizePrice>  // employeeId → CSP (from DoneBy data)
employeePaces: EmployeePace[]
```

#### `EmployeePace` type
```typescript
type EmployeePace = {
  employee: Employee;
  finishedCSP: CountSizePrice;       // what they've actually done on this servCode
  capacityRate: CountSizePrice;      // their per-day capacity (see algorithm below)
  requiredRate: CountSizePrice;      // their share of unfinishedCSP / daysRemaining
  delta: CountSizePrice;             // capacityRate - requiredRate (positive = ahead of pace)
}
```

#### Employee capacity rate algorithm

1. Collect all services completed by the employee within the **lookback window** (controlled by `DateRangePicker` in UI, stored in `paceSlice` state).
2. Group by `doneDate` → `CountSizePrice` per day.
3. Filter out days where `count < minProductiveServices` (stored in `paceSlice` state, user-configurable, default `3`). This removes rain days, sick days, and partial days without needing to know the cause.
4. Average the remaining days → **capacity rate**.
5. Employees with no qualifying days (new hires, FNG employees) → use the **average capacity rate of employees who do have data** as a proxy. If no employees have data, falls back to even distribution.

This model degrades gracefully: all-new team → even distribution. Mixed team → real data where available, proxy for the rest.

---

### 4. `paceSlice` state (UI settings)

```typescript
{
  lookbackRange: TRange<string>;      // DateRangePicker window for capacity calculation
  minProductiveServices: number;      // threshold to qualify a day as "productive" (default: 3)
}
```

Actions: `setLookbackRange`, `setMinProductiveServices`.

---

### 5. UI Plan

**`Pace.tsx`** (top level):
- `usePaceDeps()` (includes `usePacePlan`)
- Radio control: display mode (even distribution vs. capacity-weighted) — auto-defaults to weighted when sufficient history exists
- `DateRangePicker` bound to `paceSlice.lookbackRange`
- `minProductiveServices` number input

**`PaceTable.tsx`**:
- One row per `ServCodePace`, sorted by `servCodeId`
- Columns: ServCode name | Days Remaining | Unfinished (count/size/rev) | Required Daily Rate | Actual Daily Rate | Delta
- Expandable row → `EmployeePaceRow` per assigned employee

**`EmployeePaceRow.tsx`**:
- Employee name | Finished CSP | Capacity Rate | Required Rate | Delta
- Color: green = ahead, amber = slightly behind, red = significantly behind

**Fictional employee management**:
- "Add Fictional Employee" button → adds FNG-N to `pacePlan` state
- Modeled with proxy capacity rate (same as new hire)
- Shows "what-if" impact on overall pace

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `bizPlan/pace/pacePlan.md` | ✅ This file | Plan documentation |
| `bizPlan/pace/paceSelect.ts` | ✅ Partial | ServCodePace selectors — needs employee amendments |
| `bizPlan/pace/paceSlice.ts` | 🔲 Stub exists | UI settings state (lookbackRange, minProductiveServices) |
| `bizPlan/pace/pacePlanTypes.ts` | 🔲 To create | PacePlanDoc, FictionalEmployee types |
| `bizPlan/pace/pacePlanSlice.ts` | 🔲 To create | Redux slice + thunks for pacePlan CRUD |
| `bizPlan/pace/pacePlanSelect.ts` | 🔲 To create | assignedEmployeeIdsByServCode, fictionalEmployeeMap |
| `bizPlan/pace/usePacePlan.ts` | 🔲 To create | Auto-fetch hook + CRUD action exposure |
| `bizPlan/pace/usePaceDeps.ts` | ✅ Exists | Add usePacePlan |
| `bizPlan/pace/Pace.tsx` | 🔲 Stub | Top-level component |
| `bizPlan/pace/PaceTable.tsx` | 🔲 To create | ServCode-level pace table |
| `bizPlan/pace/EmployeePaceRow.tsx` | 🔲 To create | Per-employee expandable row |
| `realGreen/progServ/_lib/types/ServCodeTypes.ts` | 🔲 Amend | Add assignedTo: Employee[] to ServCodeProps |
| `realGreen/progServ/_lib/selectors/progServSelect.ts` | 🔲 Amend | Add pacePlan + employee inputs to selectProgCodes |
| `realGreen/deepSelect.ts` | ✅ Exists | No changes needed |
| `realGreen/progServ/_lib/classes/ServCodeUtils.ts` | ✅ Complete | weekDays, daysRemaining |
| `realGreen/employee/_lib/baseEmployee.ts` | ✅ Exists | Used for FNG hydration |
