# Pace — Employee View Plan

## Extension Index: `pace_04`

---

## Goal

Add a standalone employee view to the Pace page. Where the existing servCode view asks
"is each program on track?", the employee view asks "what should each employee do today?"

The production manager uses this view to:
- See each employee's full priority-ordered workload at a glance
- Reorder servCodes within an employee's priority list
- Add or remove servCodes from an employee's assignment

---

## Desired Behaviors

### Entry point
A button next to "Save All Date Range Changes" opens a large popover containing the employee
view. The popover is wide enough to show a grid of employee cards.

### Employee cards
One card per active employee who has at least one servCode in their priority list.
Cards are laid out in a responsive grid (not a single column).

Each card shows:
- **Header**: employee name
- **ServCode rows** (priority-ordered): one row per servCode in `employee.servCodeIds[]`
  - ServCode ID
  - Expected daily allocation (`expectedCSP`) — count and size
  - Fraction consumed (capacity bar or percentage)
  - Reorder controls (↑ / ↓)
  - Remove button (×)
- **Footer**: total capacity consumed + free capacity (summed across all servCodes)
- **Add servCode** button — opens a nested picker

No lookback header stats on the card. The per-program-type capacity breakdown is available
via the existing `EmployeeDetailPopover` (opened from the servCode view). Mixing program types
on a single card header would be misleading.

### Reorder
↑ / ↓ buttons on each servCode row dispatch `reorderServCodes` (already exists in
`assignmentPlanSlice`). The cascade re-runs immediately — the capacity bars update in real time
as the manager reorders.

### Add servCode
The "Add servCode" picker on each employee card shows servCodes not yet in their priority list.

**Open question:** Should adding a servCode here also add the employee to `servCode.assignedTo`
(i.e., make the employee card the primary assignment surface), or should it only update the
priority list (requiring the employee to already be assigned via the servCode card)?

Options:
- **Option A — Dual-surface**: Adding from the employee card both adds to `servCodeIds[]` AND
  adds the employee to `servCode.assignedTo`. Removing from the employee card does the reverse.
  The servCode card and employee card are fully in sync.
- **Option B — Priority-only**: The employee card only manages `servCodeIds[]` order. The
  employee must already be in `servCode.assignedTo` (assigned via the servCode card) before
  they appear in the picker. Simpler, but requires the manager to use both views.

Recommendation: **Option A**. The employee card is the natural home for "what does this person
work on", and requiring the manager to use two views to complete one task is friction.

### Remove servCode
Removes the servCode from `employee.servCodeIds[]` AND removes the employee from
`servCode.assignedTo`. Same as clicking × in `AssignmentEditor` on the servCode card.

### Filtering
The employee view shows all active employees regardless of the category filters on the left
panel. The filters are a servCode-view concern.

---

## Data Sources

All data already loaded. No new API routes needed.

| Data | Source |
|---|---|
| Employee priority lists | `assignmentPlanSelect.assignmentsByEmployeeId` |
| ServCode pace data (expectedCSP, fractionConsumed) | `paceSelect.employeePaceSummaries` |
| All active employees | `employeeSelect.employees` (filtered to `active === true`) |
| ServCode metadata (name, progCode) | `paceSelect.servCodePaceMap` |

---

## Component Tree

```
EmployeeViewButton (new)          ← button next to Save button
  └── Popover
        └── EmployeeViewPanel (new)
              └── EmployeeCard[] (new, one per employee)
                    ├── header: employee name
                    ├── ServCodePriorityRow[] (new)
                    │     ├── servCode ID + name
                    │     ├── expectedCSP display
                    │     ├── capacity fraction bar/pct
                    │     ├── ↑ / ↓ reorder buttons
                    │     └── × remove button
                    ├── footer: total consumed + free capacity
                    └── AddServCodePicker (new)
                          └── popover with servCode list + confirm
```

---

## State Changes

No new slice state needed. All mutations go through existing actions:
- `assignmentPlanActions.upsert` — for add/remove/reorder (same as `AssignmentEditor`)
- `reorderServCodes` — already exists in `assignmentPlanSlice`

---

## Selector Changes

No new selectors needed. The employee view consumes:
- `paceSelect.employeePaceSummaries` — already produces one summary per `(employee, programType)`
- `assignmentPlanSelect.assignmentsByEmployeeId` — for the priority list and reorder
- `employeeSelect.employees` — for the full employee list

**Note:** `employeePaceSummaries` is grouped by `(employee, programType)`. An employee who works
both IC1 and lawn care will have two summaries. The employee card needs to merge these — show all
servCodes from all summaries for that employee, with their respective `expectedCSP` and
`fractionConsumed`. The footer totals should sum across all program types.

This merge can be done in the component (group summaries by `employeeId`, flatten allocations)
or in a new selector. Prefer a selector for testability.

**Proposed new selector:** `selectEmployeeCardData` — groups `employeePaceSummaries` by
`employeeId`, producing one entry per employee with all allocations merged and totals summed.

---

## Open Questions

1. **Add servCode behavior (Option A vs B)** — see above. Recommendation is Option A (dual-surface).

2. **ServCode row content** — confirmed: servCode ID + `expectedCSP` (count + size) + fraction
   consumed. Still to decide: show fraction as a progress bar, a percentage, or both?

3. **Employee card ordering** — should cards be sorted alphabetically, by total capacity consumed
   (most loaded first), or by something else?

4. **Empty state** — what to show for an active employee with no servCodes in their priority list?
   Options: hide them entirely, or show a card with an "Add servCode" button and no rows.

5. **Popover size** — the popover needs to be large enough to show multiple cards side by side.
   Should it be full-screen / modal-like, or a constrained popover? Given the amount of content,
   a full-width modal (using the existing `Modal` component) may be more appropriate than a
   `Popover`.

---

## File Map

| File | Change |
|---|---|
| `pace/components/EmployeeViewButton.tsx` | **New** — button + popover/modal wrapper |
| `pace/components/EmployeeViewPanel.tsx` | **New** — grid of `EmployeeCard` components |
| `pace/components/EmployeeCard.tsx` | **New** — single employee card with priority list |
| `pace/components/ServCodePriorityRow.tsx` | **New** — one row in the employee card |
| `pace/components/AddServCodePicker.tsx` | **New** — nested picker for adding servCodes |
| `pace/paceSelect.ts` | Add `selectEmployeeCardData` selector |
| `pace/components/Pace.tsx` | Wire `EmployeeViewButton` next to Save button |

---

## Deferred

- Drag-and-drop reorder (↑/↓ buttons are sufficient for now)
- Employee view as a standalone page (not a popover)
- Filtering/sorting within the employee view
