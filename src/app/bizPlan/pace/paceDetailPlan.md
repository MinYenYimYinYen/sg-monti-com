# Pace Detail Plan

## Goal

The detail panel for a selected `ServCodePace`. Shows identity, date range editing, required daily pace, and
per-employee work distribution.

---

## Data Model Additions

### `EmployeeShare` type (new, in `PaceType.ts`)

```typescript
type EmployeeShare = {
  employee: Employee;
  shareCSP: CountSizePrice;  // unfinishedCSP / assignedTo.length (even distribution)
};
```

### `ServCodePace` additions

```typescript
type ServCodePace = {
  // ... existing fields ...
  employeeShares: EmployeeShare[];  // one entry per assigned employee; empty if none assigned
};
```

`employeeShares` is computed in `paceSelect.ts` alongside existing CSP calculations:
- `shareCSP = divideBy(unfinishedCSP, assignedTo.length)` if `assignedTo.length > 0`
- `employeeShares = []` if no employees assigned

`servCode.assignedTo: Employee[]` is already hydrated on `ServCodeDeep` (Phase 2). No new data fetching needed.

---

## Component Architecture

`PaceDetailPanel` selects `paceSelect.selectedPace` — which contains everything. It passes slices down one level only.
No component below `PaceDetailPanel` reaches into Redux for detail data.

```
PaceDetailPanel          ← selects paceSelect.selectedPace
  ├── ServCodeHeader     ← receives pace.servCode (1 level)
  ├── DateRangeEditor    ← receives servCodeId + dateRange (1 level); calls useProgServ({})
  ├── PaceRateDisplay    ← receives pace.unfinishedRate (1 level)
  └── AssignmentEditor   ← receives servCode + employeeShares (1 level); calls useAssignmentPlan({})
        └── EmployeePaceRow  ← receives EmployeeShare (1 level from AssignmentEditor)
```

---

## Components

### `ServCodeHeader`
- Displays `servCodeId` (monospace), `longName`, `progCodeId`
- Category badge (`asap` / `overdue` / `inProgress` / `notStarted` / `notSet`)

### `DateRangeEditor`
- Displays and edits `dateRange.min` / `dateRange.max` via `DateRangePicker`
- On change: calls `useProgServ({}).updateServCode({ servCodeId, dateRange })`
- Save button: calls `useProgServ({}).saveServCodeChanges()`
- `useProgServ` data is already loaded by `usePaceDeps`; this component calls it with no `autoLoad`

### `PaceRateDisplay`
- Displays `unfinishedRate` — the required daily pace to finish by `dateRange.max`
- Shows `count`, `size`, `price`, `rev` per day
- Label: "Required daily pace"

### `AssignmentEditor`
- Displays current `employeeShares` list
- Each row: `EmployeePaceRow` (employee name + their `shareCSP`)
- Add employee: employee selector (from `state.employee.employeeDocs`) → calls `useAssignmentPlan({}).upsert`
- Remove employee: × button per row → calls `useAssignmentPlan({}).upsert` with updated `employeeIds`
- `useAssignmentPlan` is already loaded by `usePaceDeps`; this component calls it with `autoLoad: false`

### `EmployeePaceRow`
- Displays employee name
- Displays their `shareCSP` (count/size/price/rev per day — their equal share of remaining work)

---

## Files

| File | Status | Purpose |
|---|---|---|
| `bizPlan/pace/PaceType.ts` | 🔲 Update | Add `EmployeeShare`, add `employeeShares` to `ServCodePace` |
| `bizPlan/pace/paceSelect.ts` | 🔲 Update | Compute `employeeShares` in `selectServCodePaces` |
| `bizPlan/pace/components/PaceDetailPanel.tsx` | 🔲 Rewrite | Real layout; passes data 1 level down |
| `bizPlan/pace/components/ServCodeHeader.tsx` | 🔲 New | Identity display |
| `bizPlan/pace/components/DateRangeEditor.tsx` | 🔲 New | Date range display + edit + save |
| `bizPlan/pace/components/PaceRateDisplay.tsx` | 🔲 New | Required daily pace display |
| `bizPlan/pace/components/AssignmentEditor.tsx` | 🔲 New | Employee assignment list + add/remove |
| `bizPlan/pace/components/EmployeePaceRow.tsx` | 🔲 New | Single employee row with share CSP |
| `bizPlan/pace/paceDetailSelect.ts` | ⏸ Deferred | Not needed yet; all data on `ServCodePace` |
