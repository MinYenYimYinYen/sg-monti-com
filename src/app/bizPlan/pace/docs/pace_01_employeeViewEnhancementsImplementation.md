# Pace Employee View — Enhancements Implementation

Split-Track checklist for `pace_01_employeeViewEnhancementsPlan.md`.

All tasks are AI-owned — no new data layer work is required. The data foundation
(`paceSelect`, `employeePaceSelect`, `AssignmentPlan`) is already in place.

---

## AI Tasks

### Feature 1 — Avg vs. Required Pace in ServCodePriorityRow

- [ ] A1: Update `ServCodePriorityRow`
  - File: `src/app/bizPlan/pace/employee/components/ServCodePriorityRow.tsx`
  - Replace the single `displayCSP` block with two count values: `avgDailyCSP.count` (muted)
    and `expectedCSP.count` (foreground), separated by a `→` arrow.
  - Arrow color is driven by `AVG_VS_REQUIRED_TOLERANCE = 0.05` (module-level const):
    - `avg / required >= 1 + tolerance` → `text-primary` (blue, ahead)
    - `avg / required >= 1 - tolerance` → `text-accent` (green, on track)
    - otherwise → `text-destructive` (red, behind)
  - When `avgDailyCSP` is null (no lookback data), show only `expectedCSP.count` with no arrow.
  - Layout: the two numbers + arrow replace the existing single CSP cluster. Size and price
    remain available in the `ServCodePaceBar` popover — no change there.

---

### Feature 2 — Urgent ServCode Card

- [ ] A2: Add `urgentServCodePaces` selector to `paceSelect`
  - File: `src/app/bizPlan/pace/paceSelect.ts`
  - Simple filter of `selectServCodePaces` to `category === "asap" || category === "overdue"`.
  - Export as `paceSelect.urgentServCodePaces`.

- [ ] A3: Build `UrgentServCodeCard`
  - File: `src/app/bizPlan/pace/employee/components/UrgentServCodeCard.tsx`
  - Reads `paceSelect.urgentServCodePaces`. Returns `null` when empty.
  - Same card dimensions as `EmployeeCard` (`w-72`). Header: "Urgent" with `bg-destructive/10`.
  - One `UrgentServCodeRow` per servCode (see A4).

- [ ] A4: Build `UrgentServCodeRow` + `UrgentServiceList` popover
  - File: `src/app/bizPlan/pace/employee/components/UrgentServCodeCard.tsx` (same file as A3)
  - Row: servCode ID (font-mono) + category badge + unfinished count. Clicking opens a popover.
  - Popover header: servCode ID + progCode ID.
  - Popover body: one row per unfinished service (`status !== "S"`), showing:
    - `CustomerLink` wrapping `customer.displayName` (tab: `"customer"`)
    - `customer.city`, `customer.zip`
    - `service.size` with `LandPlot` icon
    - `service.techNotes` — truncated to 1 line in the row; full text shown in a `Tooltip`
      on hover (use shadcn `Tooltip` component)
  - Unfinished services = `servCode.services.filter(s => s.status !== "S")`

- [ ] A5: Insert `UrgentServCodeCard` into the employee grid
  - File: `src/app/bizPlan/pace/employee/components/EmployeePace.tsx` (or wherever the card
    grid is rendered — locate the component that maps `employeeCardData` to `EmployeeCard`)
  - Render `<UrgentServCodeCard />` as the first item in the grid, before the employee cards.
  - It is always rendered (returns null internally when empty — no conditional needed here).

---

### Feature 3 — Season Remainder (Upcoming ServCodes) per Employee Card

- [ ] A6: Add `makeNotStartedAllocations` selector to `employeePaceSelect`
  - File: `src/app/bizPlan/pace/employee/employeePaceSelect.ts`
  - Factory selector: `makeNotStartedAllocations({ employeeId: string })`
  - Returns `EmployeeAllocation[]` for servCodes where:
    - `pace.category === "notStarted"`
    - The employee appears in `pace.employeeShares`
  - `expectedCSP` = employee's weighted share of `unfinishedCSP / daysRemaining` (same
    weighting logic as `makeAllocationsAtDate`, but anchored to today, not a selected date).
  - `avgDailyCSP` = `share.avgDailyCSP` (pass through from the share).
  - Sort by priority order (same as `makeAllocationsAtDate`).
  - Export as `employeePaceSelect.makeNotStartedAllocations`.

- [ ] A7: Add collapsible "Upcoming" section to `EmployeeCard`
  - File: `src/app/bizPlan/pace/employee/components/EmployeeCard.tsx`
  - Add `useState(false)` for `upcomingExpanded`.
  - Call `makeNotStartedAllocations({ employeeId })` to get `upcomingAllocations`.
  - If `upcomingAllocations.length === 0`, render nothing for this section.
  - Otherwise render a collapsible section below the active rows:
    - Header: "Upcoming ({count})" — clicking toggles `upcomingExpanded`
    - When expanded: one `ServCodePriorityRow` per upcoming allocation, with full reorder
      controls (priority order matters for capacity cascade).
    - `isFirst` / `isLast` computed against the full `allocations` array (same as active rows)
      so reordering works correctly across both sections.

---

### Feature 4 — Assignment Matrix

- [ ] A8: Create matrix page route
  - File: `src/app/bizPlan/pace/employee/matrix/page.tsx`
  - Renders `<AssignmentMatrix />`. Reuses `usePaceDeps()` for data loading.

- [ ] A9: Build `AssignmentMatrix` root component
  - File: `src/app/bizPlan/pace/employee/matrix/AssignmentMatrix.tsx`
  - Reads:
    - `paceSelect.servCodePaces` — for column data (servCodes grouped by progCode)
    - `assignmentPlanSelect.assignmentsByEmployeeId` — for current assignments
    - `employeeSelect.employees` filtered to `active === true` — for rows
  - Layout: sticky header row (program/servCode columns) + scrollable employee rows.
  - Groups servCodes by `progCode.progCodeId` for the two-level header.

- [ ] A10: Build `AssignmentMatrixHeader`
  - File: `src/app/bizPlan/pace/employee/matrix/AssignmentMatrix.tsx` (same file)
  - Two header rows:
    1. Program row: one cell per program, spanning its servCode columns. Each program cell
       has a collapse/expand toggle (chevron). Collapsed = only the program cell visible,
       no servCode columns shown for that program.
    2. ServCode row: one cell per servCode (hidden when program is collapsed).
  - Program collapse state: `useState<Set<string>>` of collapsed progCodeIds.

- [ ] A11: Build `AssignmentMatrixRow` (per employee)
  - File: `src/app/bizPlan/pace/employee/matrix/AssignmentMatrix.tsx` (same file)
  - First cell: employee name.
  - Per-program group: when program is collapsed, a single checkbox that is:
    - Checked if all servCodes in that program are assigned to this employee
    - Indeterminate if some (but not all) are assigned
    - Unchecked if none are assigned
    - Toggling checked/unchecked: assigns/unassigns all servCodes in the program.
      New servCodes are appended to `servCodeIds[]` in natural (alphabetical) order.
  - When program is expanded: one checkbox per servCode.
  - All writes via `useAssignmentPlan().upsert`.
  - No drag-to-reorder in the matrix — priority reordering stays on the employee card.
    The matrix is for assignment only.

- [ ] A12: Add navigation link to matrix from employee view
  - File: wherever the employee view header/config bar lives (likely `EmployeePace.tsx` or
    `EmployeePaceConfig.tsx`)
  - Add a "Matrix" button/link that navigates to `/bizPlan/pace/employee/matrix`.

---

## Status Table

| Task | Component / File | Depends on | Status |
|---|---|---|---|
| A1 | `ServCodePriorityRow` | — | ☐ |
| A2 | `paceSelect` — `urgentServCodePaces` | — | ☐ |
| A3 | `UrgentServCodeCard` | A2 | ☐ |
| A4 | `UrgentServCodeRow` + `UrgentServiceList` | A2 | ☐ |
| A5 | Employee grid — insert urgent card | A3, A4 | ☐ |
| A6 | `employeePaceSelect` — `makeNotStartedAllocations` | — | ☐ |
| A7 | `EmployeeCard` — Upcoming section | A6 | ☐ |
| A8 | Matrix page route | — | ☐ |
| A9 | `AssignmentMatrix` root | — | ☐ |
| A10 | `AssignmentMatrixHeader` | A9 | ☐ |
| A11 | `AssignmentMatrixRow` | A9, A10 | ☐ |
| A12 | Navigation link to matrix | A8 | ☐ |
