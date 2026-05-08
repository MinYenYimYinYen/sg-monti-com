# Pace Employee View — Enhancements Plan

Extension of the existing employee pace view (`/bizPlan/pace/employee`).

---

## Context & Goals

The employee view is the primary tool for a production manager creating daily routes. The current
state is functional but falls short in two areas:

1. **Usefulness of data displayed** — the manager needs to see avg vs. required pace side by side,
   needs to be aware of urgent servCodes without them cluttering every card, and needs a season
   remainder view per employee.
2. **Ease of configuration** — the assignment matrix is currently a per-card, per-servCode
   interaction. A matrix view would be faster for bulk setup.

The servCode root view (`/bizPlan/pace`) is acknowledged as a display-only artifact that should
eventually become an optimizer. That is out of scope for this extension.

---

## Feature 1: Avg vs. Required Pace in ServCodePriorityRow

### Desired behavior

Each servCode row on an employee card currently shows a single CSP number (the employee's
historical average). The manager needs to see both:

- **Avg** — what the employee historically does per day for this programType
- **Required** — what they need to do today to stay on pace (their weighted share of
  `unfinishedCSP / daysRemaining`)

These are already on `EmployeeAllocation`: `avgDailyCSP` and `expectedCSP`. The display just
needs to show both, with a visual separator (e.g., `17 → 22` or `17 / 22`).

Only the **count** dimension needs to be shown in the row — size and price are available in the
`ServCodePaceBar` popover. The row is already space-constrained.

### Data sources

- `allocation.avgDailyCSP.count` — historical average (already displayed)
- `allocation.expectedCSP.count` — required today (already computed, not displayed)

### Component changes

- `ServCodePriorityRow` — replace single `displayCSP` with two values: avg and required count,
  separated by a `→` arrow. Muted color for avg, foreground for required.
- No selector or type changes needed.

### Open questions

- Should the arrow be colored (green if avg ≥ required, red if avg < required)?
  Probably yes — gives instant visual signal without needing to read numbers.

---

## Feature 2: Urgent ServCode Card

### Desired behavior

A single special card that appears at the top of the employee grid (or as a fixed left panel)
listing all `asap` and `overdue` servCodes. These are not employee-specific — they just need to
get done. The card is always visible regardless of which employee cards are shown.

Each row in the card is a servCode. Clicking a row opens a popover listing:
- ServCode ID + progCode
- For each unfinished service in that servCode:
  - `customer.displayName` wrapped in `CustomerLink` (links to RealGreen customer page)
  - City, zip
  - `service.size`
  - Tech notes (hoverable — truncated in row, full text on hover/tooltip)

The card does not have reorder controls or assignment controls — it's read-only.

### Data sources

- `paceSelect.servCodePaces` filtered to `category === "asap" || category === "overdue"`
- Each `ServCodePace.servCode.services` for the service-level detail
- `service.customer.displayName`, `service.customer.city`, `service.customer.zip`,
  `service.size`, `service.techNotes`
- `CustomerLink` from `src/app/realGreen/customer/components/CustomerLink.tsx`

### New selector needed

`paceSelect.urgentServCodePaces` — filtered subset of `servCodePaces`. Simple derived selector,
no new state.

### Component tree

```
UrgentServCodeCard                    ← new, fixed card in the employee grid
  UrgentServCodeRow (per servCode)    ← new, row with popover trigger
    UrgentServiceList (popover)       ← new, lists services with CustomerLink
```

### Type additions

None — all data is already on `ServCodePace` and its nested `servCode.services`.

### Open questions

- Where does the card live in the layout? Options:
  a. First card in the employee grid (same row as employee cards)
  b. Fixed panel above the employee grid
  c. Collapsible section at the top of the left panel
  Option (a) is simplest and consistent with the card grid layout.
- Should the card be hidden when there are no urgent servCodes? Yes — no noise when clean.

---

## Feature 3: Season Remainder View per Employee Card

### Desired behavior

Each employee card currently shows only servCodes active on the selected date. The manager also
needs to see **future servCodes** — those assigned to the employee but not yet started — with the
required daily pace to complete within their window.

This is a second section on the employee card, below the current active servCodes, labeled
"Upcoming" or "Season Remainder". It shows:
- ServCode ID
- Date range (start → end)
- Required daily count to finish on time (unfinishedCSP.count / daysRemaining)
- The `ServCodePaceBar` (already handles future dates correctly)

The section is collapsible to avoid overwhelming the card when there are many future servCodes.

### Data sources

- `paceSelect.servCodePaces` filtered to `category === "notStarted"` and assigned to this employee
- `EmployeeAllocation.expectedCSP` — already computed for future dates by `makeAllocationsAtDate`
  when the selected date is in the future
- `ServCodePaceBar` — already handles future servCodes correctly

### Selector changes

`makeAllocationsAtDate` already returns future servCodes if the selected date is within their
range. The gap is that `EmployeeCard` only passes `dateAllocations` (active on selected date) to
`ServCodePriorityRow`. We need a second filtered list: allocations where
`servCode.category === "notStarted"` and the employee is assigned.

A new selector `makeNotStartedAllocations({ employeeId })` would return the employee's assigned
servCodes that haven't started yet, with their required pace computed against today's date.

### Component changes

- `EmployeeCard` — add a collapsible "Upcoming" section below the active rows
- `ServCodePriorityRow` — reuse as-is (no reorder controls needed for upcoming; could pass
  `isFirst=true, isLast=true` to hide arrows, or add a `readOnly` prop)

### Open questions

- Should upcoming servCodes show reorder controls? Probably yes — priority order matters for
  capacity cascade even for future servCodes.
- Should the section be collapsed by default? Yes — keeps the card compact until needed.
- Should the required pace in the upcoming section use today's date or the servCode's start date
  as the "from" anchor? Today's date — the manager is planning now, not from the future start.

---

## Feature 4: Assignment Matrix UI

### Desired behavior

A matrix view where:
- Rows = employees (active only)
- Columns = servCodes (or programs — TBD)
- Cells = checkbox (assigned / not assigned)
- Row drag-to-reorder within each employee's column (priority order)

This replaces the current per-card "Add servCode" picker for bulk setup. The matrix writes to
the same `AssignmentPlan` data structure — no backend changes.

### Decision: per-servCode or per-program columns?

Per-servCode is more precise but creates a wide matrix. Per-program would group servCodes under
a program header, which is more readable but loses per-servCode priority control.

**Recommendation**: per-servCode columns, grouped visually under program headers. Priority order
is per-employee, not per-program, so the existing `servCodeIds[]` structure is preserved.

### Data sources

- `paceSelect.servCodePaces` — for the column list
- `assignmentPlanSelect.assignmentsByEmployeeId` — for current assignments
- `employeeSelect.employees` — for the row list
- `assignmentPlanActions.reorderServCodes` + `useAssignmentPlan().upsert` — for writes

### Component tree

```
AssignmentMatrix                      ← new page-level component
  AssignmentMatrixHeader              ← column headers (servCode IDs grouped by program)
  AssignmentMatrixRow (per employee)  ← checkboxes + drag handles
```

### State management

No new slice state needed. All writes go through existing `assignmentPlanActions` and `upsert`.

### Open questions

- Where does this live? Options:
  a. New tab/section within the employee view page
  b. Separate route (`/bizPlan/pace/employee/matrix`)
  c. Modal/sheet triggered from the employee view
  Option (b) is cleanest — the matrix is a configuration tool, not a monitoring tool.
- Drag-to-reorder within a row: use `@dnd-kit` (already in the project?) or a simpler
  up/down button approach? Check project dependencies before deciding.

---

## Out of Scope (this extension)

- **Optimizer** — the servCode root view becoming a date-window optimizer. Significant new
  feature, separate plan doc.
- **File structure reorganization** — moving `pace/components/` shared components vs. employee-
  specific components. Worth doing in Phase 3 of this extension.
- **Per-program date ranges on AssignmentPlan** — agreed to be ill-advised given the cascade
  algorithm's dependency on flat `servCodeIds[]` priority order.

---

## Proposed Build Order

1. **Feature 1** (avg vs. required in row) — pure UI, no data changes, highest signal-to-effort
2. **Feature 2** (urgent card) — new component, new selector, high noise-reduction value
3. **Feature 3** (season remainder) — new selector + card section, medium effort
4. **Feature 4** (assignment matrix) — largest scope, separate route, lowest urgency

---

## Open Questions Summary — Resolved

| # | Question | Answer |
|---|---|---|
| 1 | Color the avg→required arrow? | Three-color: blue (ahead), green (on track), red (behind) — same semantics as pace bar. Tolerance hardcoded at 5% (`AVG_VS_REQUIRED_TOLERANCE = 0.05`), not from slice state. |
| 2 | Urgent card position in grid? | First card in the employee grid |
| 3 | Hide urgent card when empty? | Yes |
| 4 | Upcoming section collapsed by default? | Yes |
| 5 | Upcoming servCodes show reorder controls? | Yes |
| 6 | Assignment matrix: separate route or modal? | Separate route (`/bizPlan/pace/employee/matrix`) |
| 7 | Matrix columns: per-servCode or per-program? | Per-servCode grouped under collapsible program headers. Selecting a program header assigns/unassigns all its servCodes at once. ServCodes are appended in natural (alphabetical) order — ordering is handled upstream if ever needed. |
