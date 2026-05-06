# Pace — Employee View Plan

## Extension Index: `pace_04`

---

## Goal

Add a standalone employee view page to the Pace feature. Where the existing servCode view asks
"is each program on track?", the employee view asks "what should each employee do today?"

The production manager uses this view to:
- See each employee's full priority-ordered workload at a glance
- Reorder servCodes within an employee's priority list
- Add or remove servCodes from an employee's assignment

---

## Entry Point

Separate page at `/bizPlan/pace/employee` — navigated to from NavMenu under "Biz Plan".
Same `usePaceDeps` hook as the servCode view (all data already loaded).

---

## Desired Behaviors

### Employee cards
One card per active employee who has at least one servCode in their priority list.
Cards are laid out in `flex flex-row flex-wrap gap-4` — compact (~w-72), not full-width.

Each card shows:
- **Header**: employee name + overload indicator (⚠ if any dimension > 100%)
- **ServCode rows** (priority-ordered): one row per servCode in the employee's allocation list
  - ServCode ID
  - Expected / avg daily allocation (count + size, slash form)
  - Capacity bar + percentage
  - ↑ / ↓ reorder buttons
  - × remove button
- **Footer**: total capacity consumed % + free capacity %
- **Add servCode** button — opens a nested picker popover

### Left panel
Category filter only (local state in `EmployeePace`). Controls which category rows are
visible on the cards — not which employees are shown.

### Reorder
↑ / ↓ buttons dispatch `assignmentPlanActions.reorderServCodes` (optimistic) then
`assignmentPlanActions.upsertAssignmentPlan` (persist). Cascade re-runs immediately.

### Add servCode — Dual-surface
Adding from the employee card both adds to `servCodeIds[]` AND adds the employee to
`servCode.assignedTo`. Removing does the reverse. The servCode card and employee card
are fully in sync.

### Filtering
Left panel category filter controls which servCode rows are visible on each card.
All active employees with assignments are always shown.

---

## Data Sources

All data already loaded. No new API routes needed.

| Data | Source |
|---|---|
| Employee priority lists | `assignmentPlanSelect.assignmentsByEmployeeId` |
| Per-employee merged pace data | `paceSelect.employeeCardData` (new selector) |
| All active employees | `employeeSelect.employees` (filtered to `active === true`) |
| All servCode paces | `paceSelect.servCodePaceMap` |

---

## New Type: `EmployeeCardData`

Added to `PaceType.ts`. Merges `EmployeePaceSummary[]` across all programTypes for a
single employee into one flat structure for the card view.

```typescript
type EmployeeCardData = {
  employee: Employee;
  // Priority-ordered allocations merged across all programTypes
  allocations: EmployeeAllocation[];
  // Cross-type totals (summed from all summaries)
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
  isOverloaded: boolean;
};
```

---

## New Selector: `selectEmployeeCardData`

Added to `paceSelect.ts`. Groups `employeePaceSummaries` by `employeeId`, merges
allocations across programTypes (preserving priority order from `assignmentsByEmployeeId`),
and sums the cross-type totals. Only includes employees with at least one allocation.

---

## Component Tree

```
src/app/bizPlan/pace/employee/
  page.tsx                          ← Next.js page, calls usePaceDeps
  
src/app/bizPlan/pace/components/
  EmployeePace.tsx                  ← layout: left panel + scrollable card grid
  EmployeePaceListPanel.tsx         ← left panel: category filter (local state)
  EmployeeCard.tsx                  ← one card per employee
  ServCodePriorityRow.tsx           ← one row per servCode allocation
  AddServCodePicker.tsx             ← popover for adding servCodes
```

---

## State Changes

No new Redux state. All mutations use existing actions:
- `assignmentPlanActions.reorderServCodes` — optimistic reorder
- `assignmentPlanActions.upsertAssignmentPlan` — persist reorder + add/remove

---

## File Map

| File | Change |
|---|---|
| `pace/PaceType.ts` | Add `EmployeeCardData` type |
| `pace/paceSelect.ts` | Add `selectEmployeeCardData` selector |
| `pace/employee/page.tsx` | **New** — Next.js page |
| `pace/components/EmployeePace.tsx` | **New** — top-level layout |
| `pace/components/EmployeePaceListPanel.tsx` | **New** — left panel with category filter |
| `pace/components/EmployeeCard.tsx` | **New** — single employee card |
| `pace/components/ServCodePriorityRow.tsx` | **New** — one row in the employee card |
| `pace/components/AddServCodePicker.tsx` | **New** — nested picker for adding servCodes |
| `src/components/navBar/NavMenu.tsx` | Add "Employee Pace" entry to bizPlanSection |

---

## Implementation Tasks

| Task | Status |
|---|---|
| A1 — `PaceType.ts`: Add `EmployeeCardData` | — |
| A2 — `paceSelect.ts`: Add `selectEmployeeCardData` | — |
| A3 — `employee/page.tsx` + `EmployeePace.tsx` | — |
| A4 — `EmployeePaceListPanel.tsx` | — |
| A5 — `EmployeeCard.tsx` + `ServCodePriorityRow.tsx` | — |
| A6 — `AddServCodePicker.tsx` | — |
| A7 — `NavMenu.tsx`: Add entry | — |

---

## Deferred

- Drag-and-drop reorder (↑/↓ buttons are sufficient for now)
- Sorting employees (alphabetical is fine for now)
- Per-employee filtering
