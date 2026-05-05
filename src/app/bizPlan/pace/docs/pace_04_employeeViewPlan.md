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

## Capacity Model Change (implemented in this extension)

The cascade allocation model was updated to use `totalAvgDailyCSP` instead of `totalMaxDailyCSP`
as the capacity ceiling and `fractionConsumed` denominator.

**Why:** `totalMaxDailyCSP` is a per-dimension phantom — each dimension (count, size, price)
independently takes its best day, so the combined value was never actually achieved on a single
day. For example, Ryan's max count (20 jobs) came from a day of small jobs, and his max size
(454 sq ft) came from a different day of large jobs. The combined `{ count: 20, size: 454 }`
never happened. Using it as the capacity ceiling understated how loaded employees were.

`totalAvgDailyCSP` (mean total daily production across all program types) reflects a realistic
typical day. Capacity bars now read "fraction of a normal day" rather than "fraction of a
theoretical peak."

**What changed:**
- `LookbackStats` — added `totalAvgDailyCSP` alongside `totalMaxDailyCSP`
- `selectEmployeeLookbackMap` — computes `totalAvgByEmployee` in parallel with `totalMaxByEmployee`
- `selectServCodePaces` — cascade ceiling is now `totalAvgDailyCSP`; `fractionConsumed = expectedCSP / totalAvgDailyCSP`
- `EmployeePaceSummary` — added `totalMaxDailyCSP` and `totalAvgDailyCSP` fields
- `EmployeePaceDetail` — displays both totals side by side; Avg column is marked with ✓ to
  indicate it drives capacity

`totalMaxDailyCSP` is retained for display only — it gives the manager context on the employee's
peak output alongside the average.

---

## Desired Behaviors

### Entry point
A button next to "Save All Date Range Changes" opens a large modal containing the employee
view. The modal is wide enough to show a grid of employee cards.

### Employee cards
One card per active employee who has at least one servCode in their priority list.
Cards are laid out in a responsive grid (not a single column).

Each card shows:
- **Header**: employee name
- **ServCode rows** (priority-ordered): one row per servCode in `employee.servCodeIds[]`
  - ServCode ID
  - Expected daily allocation (`expectedCSP`) — count and size
  - Fraction consumed (capacity bar + percentage)
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

### Add servCode — Option A (Dual-surface)
Adding from the employee card both adds to `servCodeIds[]` AND adds the employee to
`servCode.assignedTo`. Removing from the employee card does the reverse. The servCode card
and employee card are fully in sync.

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
  └── Modal
        └── EmployeeViewPanel (new)
              └── EmployeeCard[] (new, one per employee)
                    ├── header: employee name
                    ├── ServCodePriorityRow[] (new)
                    │     ├── servCode ID + name
                    │     ├── expectedCSP display
                    │     ├── capacity fraction bar + pct
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

### New selector: `selectEmployeeCardData`
Groups `employeePaceSummaries` by `employeeId`, producing one entry per employee with all
allocations merged across program types and totals summed. This merge is done in a selector
for testability rather than in the component.

The employee view consumes:
- `paceSelect.employeeCardData` (new) — merged per-employee data
- `assignmentPlanSelect.assignmentsByEmployeeId` — for reorder mutations
- `employeeSelect.employees` — for the full employee list (add picker)
- `paceSelect.servCodePaceMap` — for the add picker (all servCodes)

---

## Open Questions (resolved)

1. **Add servCode behavior** — **Option A** (dual-surface). Adding from the employee card
   both adds to `servCodeIds[]` AND adds the employee to `servCode.assignedTo`.

2. **ServCode row content** — servCode ID + `expectedCSP` (count + size) + capacity bar
   with percentage.

3. **Employee card ordering** — alphabetical by employee name.

4. **Empty state** — hide employees with no servCodes in their priority list entirely.

5. **Modal vs Popover** — use the existing `Modal` component (full-screen overlay with GSAP
   animation). A constrained popover is too small for a multi-card grid.

---

## File Map

| File | Change |
|---|---|
| `pace/_lib/employeeLookbackUtils.ts` | Added `totalAvgDailyCSP` to `LookbackStats`; updated `computeLookbackStats` signature |
| `pace/PaceType.ts` | Added `totalMaxDailyCSP` and `totalAvgDailyCSP` to `EmployeePaceSummary` |
| `pace/paceSelect.ts` | Cascade ceiling → `totalAvgDailyCSP`; `fractionConsumed` denominator → `totalAvgDailyCSP`; `EmployeePaceSummary` now includes both totals |
| `pace/components/EmployeePaceDetail.tsx` | Updated capacity stats display to show per-type and total rows with Max/Avg columns |
| `pace/components/EmployeeViewButton.tsx` | **New** — button + Modal wrapper |
| `pace/components/EmployeeViewPanel.tsx` | **New** — grid of `EmployeeCard` components |
| `pace/components/EmployeeCard.tsx` | **New** — single employee card with priority list |
| `pace/components/ServCodePriorityRow.tsx` | **New** — one row in the employee card |
| `pace/components/AddServCodePicker.tsx` | **New** — nested picker for adding servCodes |
| `pace/paceSelect.ts` | Add `selectEmployeeCardData` selector |
| `pace/components/Pace.tsx` | Wire `EmployeeViewButton` next to Save button |

---

## Deferred

- Drag-and-drop reorder (↑/↓ buttons are sufficient for now)
- Employee view as a standalone page (not a modal)
- Filtering/sorting within the employee view
