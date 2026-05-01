# Pace Detail Plan

## Goal

The detail panel for a selection of `ServCodePace` items. Each selected service code is rendered as a
`ServCodePaceCard` — a self-contained card showing identity, date range editing, required daily pace, and
per-employee work distribution. The detail panel renders one card per selected service code, filtered by
`unfinishedOnly` state.

---

## Context: How the Detail Panel is Populated

The detail panel does **not** select a single service code. Instead, `PaceDetailPanel` reads
`paceSelect.selectedPaces: ServCodePace[]`, which is derived from `state.pace.selectedServCodeIds`. This array is
populated by the list panel in two ways:

- **ProgCode selection**: all `servCodeIds` belonging to the selected `ProgCode`
- **"All In Progress" selection**: all `servCodeIds` with `category === "inProgress"` (via
  `paceSelect.inProgressServCodeIds`)

The detail panel applies `unfinishedOnly` filtering locally: if `state.pace.unfinishedOnly` is true, only cards
where `unfinishedCSP.count > 0` are rendered.

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

```
PaceDetailPanel              ← selects paceSelect.selectedPaces; applies unfinishedOnly filter
  └── ServCodePaceCard[]     ← one card per ServCodePace; receives full ServCodePace (1 level)
        ├── ServCodeHeader   ← receives pace.servCode (1 level)
        ├── DateRangeEditor  ← receives servCodeId + dateRange (1 level); calls useProgServ({})
        ├── PaceRateDisplay  ← receives pace.unfinishedRate (1 level)
        └── AssignmentEditor ← receives servCode + employeeShares (1 level); calls useAssignmentPlan({})
              └── EmployeePaceRow  ← receives EmployeeShare (1 level from AssignmentEditor)
```

`PaceDetailPanel` passes each `ServCodePace` down to `ServCodePaceCard`. No component below `PaceDetailPanel`
reaches into Redux for detail data.

---

## Components

### `PaceDetailPanel`
- Selects `paceSelect.selectedPaces` and `paceSelect.unfinishedOnly`
- If `selectedPaces` is empty (nothing selected): renders dashed border placeholder — "Select a program to view
  pace details"
- If `selectedPaces` is non-empty but all are filtered out by `unfinishedOnly`: renders "All service codes are
  complete" message
- Otherwise: renders a scrollable list of `ServCodePaceCard` components, one per passing `ServCodePace`

### `ServCodePaceCard`
- Receives a single `ServCodePace`
- Card wrapper (border, rounded, padding) containing the four sub-components below
- Passes slices of `ServCodePace` down one level only

### `ServCodeHeader`
- Displays `servCodeId` (monospace), `longName`, `progCodeId`
- Category badge (`asap` / `overdue` / `inProgress` / `notStarted` / `notSet`) styled via `CATEGORY_BADGE_STYLES`

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
| `bizPlan/pace/paceSelect.ts` | 🔲 Update | Compute `employeeShares` in `selectServCodePaces`; add `selectSelectedPaces` |
| `bizPlan/pace/components/PaceDetailPanel.tsx` | 🔲 Rewrite | Renders `ServCodePaceCard[]`; applies `unfinishedOnly` filter |
| `bizPlan/pace/components/ServCodePaceCard.tsx` | 🔲 New | Card wrapper for a single `ServCodePace` |
| `bizPlan/pace/components/ServCodeHeader.tsx` | 🔲 New | Identity display |
| `bizPlan/pace/components/DateRangeEditor.tsx` | 🔲 New | Date range display + edit + save |
| `bizPlan/pace/components/PaceRateDisplay.tsx` | 🔲 New | Required daily pace display |
| `bizPlan/pace/components/AssignmentEditor.tsx` | 🔲 New | Employee assignment list + add/remove |
| `bizPlan/pace/components/EmployeePaceRow.tsx` | 🔲 New | Single employee row with share CSP |
| `bizPlan/pace/paceDetailSelect.ts` | ⏸ Deferred | Not needed yet; all data on `ServCodePace` |
