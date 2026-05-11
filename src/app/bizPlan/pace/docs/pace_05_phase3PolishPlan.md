# Pace — Phase 3 Polish Plan

## Extension Index: `pace_05`

**Reference:** Phase 3 of the AgentWorkflow.md Feature Development Lifecycle.

---

## Goals

1. **Deprecate the servCode view** (`/bizPlan/pace`) — superseded by the employee view and
   assignment matrix. The `deltaDays` signal in the matrix derives from the same underlying
   data as `teamAvgCapacity / unfinishedRate`, making the servCode view redundant.
2. **Rename selectors** to communicate the per-(employee, programType) vs. per-employee
   distinction that was previously obscured.
3. **Remove dead code** left over from `pace_03` (reorder controls in `EmployeePaceDetail`).
4. **Extract shared constants** (`OVERLOAD_EPSILON`, `ServCodePaceDelta`) to their canonical
   locations.
5. **Update implementation docs** to reflect actual build state.

---

## Task List

---

### Human Tasks

**Y1 — Move files to `employee/components/`** (IDE handles import updates automatically)

- [ ] Move `pace/components/EmployeePaceListPanel.tsx` → `pace/employee/components/EmployeePaceListPanel.tsx`
- [ ] Move `pace/components/EmployeePaceConfig.tsx` → `pace/employee/components/EmployeePaceConfig.tsx`
- [ ] Move `pace/components/DateRangeEditor.tsx` → `pace/employee/components/DateRangeEditor.tsx`

**Y2 — Delete servCode view files** (do after AI tasks A1–A7 are complete)

- [ ] Delete `pace/components/Pace.tsx`
- [ ] Delete `pace/components/PaceListPanel.tsx`
- [ ] Delete `pace/components/PaceDetailPanel.tsx`
- [ ] Delete `pace/components/ServCodePaceCard.tsx`
- [ ] Delete `pace/components/ServCodeHeader.tsx`
- [ ] Delete `pace/components/PaceRateDisplay.tsx`
- [ ] Delete `pace/components/ProgCodePaceItem.tsx`
- [ ] Delete `pace/components/PaceDisplayConfig.tsx`
- [ ] Delete `pace/components/AssignmentEditor.tsx`
- [ ] Delete `pace/components/EmployeePaceRow.tsx`
- [ ] Delete `pace/components/EmployeeDetailPopover.tsx`
- [ ] Delete `pace/components/EmployeePaceDetail.tsx`

Signal to AI when Y1 + Y2 are done so A8 (doc update) can proceed.

---

### AI Tasks

**A1 — `paceSlice.ts`: Remove servCode view state**

Remove from `PaceState`, `initialState`, and `reducers`:
- Fields: `sortMode`, `activeFilters`, `unfinishedOnly`, `selectionSource`,
  `selectedServCodeIds`, `selectedProgCodeId`
- Actions: `setSortMode`, `setActiveFilters`, `setUnfinishedOnly`, `setSelectedServCodeIds`,
  `setSelectionSource`, `setSelectedProgCodeId`
- Type exports: `PaceSortMode`, `PaceSelectionSource`

Keep: `lookbackConfig`, `matrixDisplayConfig`, and all their actions/types.

---

**A2 — `paceSelect.ts`: Remove servCode view selectors + rename**

Remove selectors (and from export object):
- `selectSortMode`, `selectActiveFilters`, `selectUnfinishedOnly`
- `selectSelectedServCodeIds`, `selectSelectedProgCodeId`, `selectSelectionSource`
- `selectFilteredSortedProgCodePaces`
- `selectActiveServCodeIds`
- `selectSelectedPaces`

Rename:
- `selectEmployeePaceSummaries` → `selectEmployeePaceByProgramType`
  Export as `paceSelect.employeePaceByProgramType`
- `selectEmployeeCardData` → `selectEmployeePaceSummaries`
  Export as `paceSelect.employeePaceSummaries`

Remove `ServCodePaceDelta` type definition (moved to `PaceType.ts` in A7).
Keep re-export for `AssignmentMatrix.tsx` consumer.

---

**A3 — `employeePaceSelect.ts`: Rename selectors**

- `makeSelectEmployeeAllocationsAtDate` → `makeSelectProjectedAllocations`
  Export as `employeePaceSelect.makeProjectedAllocations`
- `selectEmployeeShareRemainingMap` → `selectEmployeeUnfinishedShareMap`
  Export as `employeePaceSelect.employeeUnfinishedShareMap`

---

**A4 — Update consumers of renamed selectors**

- `EmployeePace.tsx`: `paceSelect.employeeCardData` → `paceSelect.employeePaceSummaries`
- `EmployeeCard.tsx`: `employeePaceSelect.makeAllocationsAtDate` → `employeePaceSelect.makeProjectedAllocations`
- `ServCodePriorityRow.tsx`: `employeePaceSelect.employeeShareRemainingMap` → `employeePaceSelect.employeeUnfinishedShareMap`

---

**A5 — `pace/page.tsx`: Redirect to employee view**

Replace the `<Pace />` render with a Next.js redirect:

```tsx
import { redirect } from "next/navigation";
export default function pacePage() {
  redirect("/bizPlan/pace/employee");
}
```

---

**A6 — `EmployeePaceDetail.tsx`: Remove dead reorder code**

The reorder controls were removed from the JSX in `pace_03` but the backing logic was left
as dead code. Remove:
- `ChevronUp`, `ChevronDown` imports from `lucide-react`
- `useAppDispatch` import
- `useAssignmentPlan` import
- `assignmentPlanSelect` import
- `assignmentPlanActions` import
- `dispatch` variable
- `upsert` variable
- `assignmentsByEmployeeId` selector call
- `handleMove` function

---

**A7 — `PaceType.ts`: Add `OVERLOAD_EPSILON` + move `ServCodePaceDelta`**

Add to `PaceType.ts`:
```typescript
export const OVERLOAD_EPSILON = 0.001;

export type ServCodePaceDelta = {
  servCodeId: string;
  dateRange: TRange<string>;
  projectedEndDate: string | null;
  deltaDays: number | null;
};
```

Update `paceSelect.ts`:
- Import `OVERLOAD_EPSILON` from `PaceType.ts`; remove the local `const OVERLOAD_EPSILON = 0.001`
- Remove the `ServCodePaceDelta` type definition; add `export type { ServCodePaceDelta } from "@/app/bizPlan/pace/PaceType"` (or keep the re-export inline for `AssignmentMatrix.tsx`)

Update `EmployeePaceRow.tsx`:
- Import `OVERLOAD_EPSILON` from `PaceType.ts`; remove the inline `const OVERLOAD_EPSILON = 0.001`

---

**A8 — `pace_01_employeeViewEnhancementsImplementation.md`: Update task statuses**

Mark A1–A12 as complete. Add a "Deviations from Plan" section:

- **`showUpcoming` as Redux state** — implemented in `employeePaceSlice` rather than local
  component state in `EmployeePace.tsx`. Allows the toggle to persist across navigation.
- **`AssignmentMatrix` route** — built at `bizPlan/assignmentPlan/matrix/` rather than
  `bizPlan/pace/employee/matrix/` as originally planned. Reflects that the matrix is a
  configuration tool for the assignment plan, not a sub-view of the employee pace page.
- **`UrgentServCodeCard` filter** — displays only `active` + `asap` status services (excludes
  `printed`), since printed services are already scheduled and the manager shouldn't be
  looking for work that's on a route.

---

## Sequencing

| Step | Who | Task | Depends on |
|---|---|---|---|
| 1 | AI | A6 — Remove dead reorder code | — |
| 2 | AI | A7 — Extract OVERLOAD_EPSILON + ServCodePaceDelta | — |
| 3 | AI | A1 — paceSlice cleanup | — |
| 4 | AI | A2 — paceSelect cleanup + renames | A1 |
| 5 | AI | A3 — employeePaceSelect renames | — |
| 6 | AI | A4 — Update consumers | A2, A3 |
| 7 | AI | A5 — page.tsx redirect | — |
| 8 | Human | Y1 — Move files | A1–A7 done |
| 9 | Human | Y2 — Delete files | Y1 done |
| 10 | AI | A8 — Doc update | Y1 + Y2 done |

---

## Status Table

| Task | Owner | Status |
|---|---|---|
| A1 — paceSlice: remove servCode view state | AI | — |
| A2 — paceSelect: remove + rename | AI | — |
| A3 — employeePaceSelect: rename | AI | — |
| A4 — Update consumers | AI | — |
| A5 — pace/page.tsx redirect | AI | — |
| A6 — EmployeePaceDetail: dead code removal | AI | — |
| A7 — PaceType: OVERLOAD_EPSILON + ServCodePaceDelta | AI | — |
| Y1 — Move 3 files | Human | — |
| Y2 — Delete 12 files | Human | — |
| A8 — Doc update | AI | — |
