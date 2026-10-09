# Pace Setup UI Plan

---

## Required Reading

Before implementing any part of this plan, read **only** the files listed below. They contain all the context needed to execute the plan. Do not read other files unless you have explicit permission from the user.

### Types (data contracts)

| File | Why |
|---|---|
| `src/app/pace/assignmentGroup/AssignmentGroupTypes.ts` | `AssignmentGroupDoc`, `AssignmentGroupProps`, `AssignmentGroup` |
| `src/app/pace/groupSequence/GroupSequenceTypes.ts` | `GroupSequence` |
| `src/app/pace/assignmentPlan/AssignmentPlanTypes.ts` | `Scenario`, `AssignmentPlan`, `GroupAssignment` |
| `src/app/pace/seasonPlan/SeasonPlanTypes.ts` | `SeasonPlan`, `GroupSchedule` |

### Selectors (source of truth for UI)

| File | Why |
|---|---|
| `src/app/pace/assignmentGroup/assignmentGroupSelect.ts` | Hydrated `AssignmentGroup[]` with `sequenceId`, `plannedStart/End`, `goalsByEmployee`, `assignedEmployeeIds` |
| `src/app/pace/groupSequence/groupSequenceSelect.ts` | `sequences`, `sequenceMap`, `sequenceIdByGroupId` |
| `src/app/pace/assignmentPlan/assignmentPlanSelect.ts` | `assignmentPlans`, `assignmentsByEmployeeId`, `isDirty`, `activeScenario` |
| `src/app/pace/seasonPlan/seasonPlanSelect.ts` | `activeSeasonPlan`, `groupScheduleMap` |
| `src/app/pace/paceSelect.ts` | `mainDate`, `goalMultiplier`, `goalMultiplierGroupIds` |

### Slices (actions for mutations)

| File | Why |
|---|---|
| `src/app/pace/assignmentGroup/assignmentGroupSlice.ts` | `getGroups`, `upsertGroup`, `deleteGroup` |
| `src/app/pace/groupSequence/groupSequenceSlice.ts` | `getSequences`, `upsertSequence`, `deleteSequence` |
| `src/app/pace/assignmentPlan/assignmentPlanSlice.ts` | `reorderGroupAssignments`, `setGoal`, `applyGoalMultiplier`, `upsertScenario` |
| `src/app/pace/paceSlice.ts` | `setGoalMultiplier`, `setGoalMultiplierGroupIds` |

### Hooks (dispatchers)

| File | Why |
|---|---|
| `src/app/pace/assignmentGroup/useAssignmentGroup.ts` | `upsertGroup`, `deleteGroup` |
| `src/app/pace/groupSequence/useGroupSequence.ts` | `upsertSequence`, `deleteSequence` |
| `src/app/pace/assignmentPlan/useAssignmentPlan.ts` | `upsertScenario`, `activateScenario` |

### Existing UI to understand (do not copy — understand patterns only)

| File | Why |
|---|---|
| `src/app/pace/layout.tsx` | Tab definitions, header layout, `PaceScenarioSelector` placement |
| `src/app/pace/assignments/_components/PaceScenarioSelector.tsx` | Save/Save As logic, `isDirty` indicator, path-gating |
| `src/app/pace/assignments/_components/AssignmentsPage.tsx` | Current 4-panel layout (being replaced by Setup) |
| `src/app/pace/assignments/_components/GroupSequenceRow.tsx` | Drag-to-reorder pattern to reuse |
| `src/app/pace/assignments/_components/EmployeeAssignmentCard.tsx` | Goal input pattern, availability sheet trigger |
| `src/app/pace/seasonPlan/_components/FeasibilityBadge.tsx` | Feasibility popover pattern |

### Shared components to use

| File | Why |
|---|---|
| `src/style/components/dialog.tsx` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` |
| `src/style/components/accordion.tsx` | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `src/style/components/button.tsx` | `Button` with `variant` + `intensity` props |
| `src/style/components/popover.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent` |
| `src/components/PageLayout/PageLayout.tsx` | `PageLayout`, `PageLayout.Header`, `PageLayout.Body` |
| `src/components/PageLayout/TabNav.tsx` | `TabNav`, `TabNavItem` |
| `src/app/employeeAvailability/_components/EmployeeAvailabilitySheet.tsx` | Reuse directly — do not rewrite |

### Styling reference

| File | Why |
|---|---|
| `src/style/style.readme.md` | Semantic color system, variant + intensity rules |

---

## Context Summary

### The Data Hierarchy

```
ServCode  (RealGreen, read-only — source of pool/revenue data)
  └─ AssignmentGroupDoc  (groupId, label, servCodeIds[])
       └─ GroupSequence  (sequenceId, label, groupIds[], daysSince)
            └─ AssignmentPlan  (employeeId → groupAssignments[{ groupId, dailyRevenueGoal }])
                  └─ SeasonPlan  (name, groupSchedules[{ groupId, plannedStart, plannedEnd }],
                                  cascadeThreshold, snowMelt, snowDeadline)
```

### Key Constraints

- A `ServCode` can only belong to **one** `AssignmentGroup`. The picker must exclude already-grouped servCodes.
- An `AssignmentGroup` can only belong to **one** `GroupSequence` (or none — standalone). A group cannot be in two sequences simultaneously.
- A group that is in a sequence cannot also appear as a standalone group in the engine. The engine wraps standalone groups in synthetic single-member sequences internally.
- `AssignmentPlan` is per-employee. The bond is **employee → group** (not employee → sequence). However, the UI should offer a convenience to add all groups in a sequence to an employee's assignment array at once.
- `dailyRevenueGoal` is per-employee per-group. The engine uses it to project future work. `null` means no goal set — the engine marks the group as missing goals.
- The assignment array **order matters**. The engine works top-priority groups first. Index 0 = highest priority.

### Staging / Persistence Model

| Entity | Persistence |
|---|---|
| `AssignmentGroupDoc` | Persisted immediately on `upsertGroup` — no staging |
| `GroupSequence` | Persisted immediately on `upsertSequence` — no staging |
| `SeasonPlan` | Persisted immediately on `upsertSeasonPlan` — no staging |
| `AssignmentPlan` | **Staged in Redux** (`state.paceAssignmentPlan.assignmentPlans`). Persisted only when user clicks "Save" in `PaceScenarioSelector` via `upsertScenario`. The `isDirty` selector detects divergence from the active scenario's saved plans. |

The `PaceScenarioSelector` in `layout.tsx` already handles Save / Save As / scenario switching. It currently shows Save controls only on `/pace/assignments`. The Setup employees page must also show these controls (extend the path check).

### What the Engine Reads

The pace engine (`runPaceEngine`) is a pure function that reads from `selectPaceEngineInputs`. It consumes:
- `assignmentGroupsScaled` — groups with `goalsByEmployee` scaled by `goalMultiplier`
- `sequences` — normalized (standalone groups wrapped as synthetic single-member sequences)
- `assignmentPlans` — the staged (possibly unsaved) plans from Redux
- `activeSeasonPlan` — for `groupScheduleMap` and `cascadeThreshold`

This means **any change to `assignmentPlans` in Redux immediately re-runs the engine** and updates the burndown chart. The user can simulate a season by adjusting assignments, reading the burndown, then deciding whether to commit.

---

## New Route: `/pace/setup`

### Tab Addition

Add to `TABS` in `src/app/pace/layout.tsx`:

```tsx
{ label: "Setup", href: "/pace/setup", icon: Settings2 }
```

Place it between "Assignments" and "Season Plan" in the tab order.

### Sub-Tab Structure

The Setup section has two sub-tabs rendered via a nested `TabNav` in the Setup layout:

```
/pace/setup           → redirect to /pace/setup/groups
/pace/setup/groups    → SetupGroupsPage
/pace/setup/employees → SetupEmployeesPage
```

### File Structure

```
src/app/pace/setup/
  layout.tsx                        ← "use client", renders sub-TabNav, no useDeps (parent covers it)
  page.tsx                          ← redirect("/pace/setup/groups")
  setupSelect.ts                    ← additive selectors for setup pages
  groups/
    page.tsx                        ← thin: renders <SetupGroupsPage />
    _components/
      SetupGroupsPage.tsx           ← main list + toolbar
      GroupListItem.tsx             ← standalone group row
      SequenceCard.tsx              ← accordion card for a sequence + its member groups
      SequenceMemberRow.tsx         ← group row inside a sequence card
      GroupDialog.tsx               ← create/edit group dialog (includes sequence membership)
      SequenceDialog.tsx            ← create/edit sequence dialog (group picker + drag reorder)
      GroupGoalsDialog.tsx          ← per-group employee goal editor
      ServCodePicker.tsx            ← reusable servCode multi-select (extracted from existing forms)
  employees/
    page.tsx                        ← thin: renders <SetupEmployeesPage />
    _components/
      SetupEmployeesPage.tsx        ← two-panel layout
      EmployeeListPanel.tsx         ← left panel: employee list with assignment count
      EmployeeAssignmentPanel.tsx   ← right panel: selected employee's assignment editor
      AssignmentRow.tsx             ← single draggable group assignment row with goal input
      AddGroupDropdown.tsx          ← add individual group to employee
      AddSequenceDropdown.tsx       ← add all groups in a sequence to employee
```

---

## Groups Page (`/pace/setup/groups`)

### Layout

Full-height scrollable list. No side panels. Toolbar at top.

```
┌─────────────────────────────────────────────────────────────┐
│  [+ New Group]  [+ New Sequence]              [search input] │  ← toolbar (shrink-0)
├─────────────────────────────────────────────────────────────┤
│  ┌─ Lawn Renovation (sequence) ─────────────────────────┐   │
│  │  1. LR1/LM  ·  3 employees  ·  Apr 1 – May 15  [✎]  │   │
│  │  2. LR6     ·  2 employees  ·  May 16 – Jun 30 [✎]  │   │
│  │  [Edit Sequence]  [Delete Sequence]                   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  Aeration (standalone)  ·  AE1  ·  5 emp  ·  Sep–Oct  [✎]  │
│  Overseeding (standalone)  ·  OS1  ·  no employees  [✎]     │
└─────────────────────────────────────────────────────────────┘
```

### `SetupGroupsPage.tsx`

- Reads from `setupSelect.sequencesWithGroups` and `setupSelect.standaloneGroups`
- Renders `SequenceCard` for each sequence (using `Accordion`)
- Renders `GroupListItem` for each standalone group
- Toolbar: "New Group" button → opens `GroupDialog` (create mode), "New Sequence" button → opens `SequenceDialog` (create mode)
- Manages dialog open state locally (`useState`)

### `SequenceCard.tsx`

- `AccordionItem` wrapping
- Header: sequence label, member count, "Edit" button (opens `SequenceDialog`), "Delete" button (confirm inline)
- Expanded body: ordered list of `SequenceMemberRow` components
- Delete sequence: calls `deleteSequence(sequenceId)` — member groups become standalone

### `SequenceMemberRow.tsx`

- Shows: position number, group label, servCode badges, assigned employee count, planned date range, `FeasibilityBadge`
- "Edit Group" icon → opens `GroupDialog` in edit mode for that group
- "Goals" button → opens `GroupGoalsDialog` for that group

### `GroupListItem.tsx`

- Shows: group label, servCode badges, assigned employee count, planned date range, `FeasibilityBadge`
- "Edit" icon → opens `GroupDialog` in edit mode
- "Goals" button → opens `GroupGoalsDialog`
- Delete button (confirm inline) — warns if group has assigned employees

### `GroupDialog.tsx`

Centered `Dialog`, ~560px wide. Used for both create and edit.

**Fields:**
1. **ServCode picker** (`ServCodePicker`) — multi-select grouped by progCode. Excludes servCodes already in another group. Shows unscheduled pool in red (reuse logic from existing `NewGroupForm`). Disabled in edit mode (servCodes are immutable after creation — `groupId` is derived from them).
2. **Label** — text input, auto-defaults to sorted servCode IDs joined with "+".
3. **Sequence membership** — three radio options:
   - "Standalone" — no sequence
   - "Add to existing sequence" — dropdown of existing sequences (only shown if sequences exist)
   - "Create new sequence with this group" — reveals: sequence label input + days-between-rounds input. Creates the sequence on save with this group as its first member.

**Save behavior:**
- Calls `upsertGroup(assignmentGroupDoc)` (persists immediately)
- If "Create new sequence": also calls `upsertSequence(...)` with the new group as `groupIds[0]`
- If "Add to existing sequence": calls `upsertSequence({ ...existingSequence, groupIds: [...existingSequence.groupIds, newGroupId] })`

### `SequenceDialog.tsx`

Centered `Dialog`, ~560px wide. Used for both create and edit.

**Fields:**
1. **Label** — text input (required)
2. **Days between rounds** — optional number input (0 = no constraint)
3. **Group picker** — multi-select list of **standalone groups only** (groups already in a sequence are excluded). In edit mode, the sequence's current members are pre-selected and shown at the top.
4. **Drag-to-reorder** — selected groups shown in a draggable list (reuse drag logic from `GroupSequenceRow`). Order determines cascade unlock order.

**Save behavior:**
- Calls `upsertSequence(...)` (persists immediately)
- If groups were removed from the sequence, they become standalone (no separate action needed — the sequence's `groupIds` no longer references them)

### `GroupGoalsDialog.tsx`

Centered `Dialog`, ~480px wide.

**Purpose:** Edit daily revenue goals for all employees assigned to a specific group. This is the "speed up / slow down a group" workflow.

**Content:**
- Title: "Goals — [Group Label]"
- List of assigned employees (from `group.assignedEmployeeIds`)
- Each row: employee name + goal input ($/day, same pattern as `EmployeeAssignmentCard`)
- Team total shown at bottom (sum of all non-null goals)
- "No employees assigned" empty state with link to Employees tab

**Save behavior:**
- Dispatches `paceAssignmentPlanActions.setGoal({ employeeId, groupId, dailyRevenueGoal })` for each changed goal
- Changes are staged in Redux — user must save the scenario to persist
- Dialog shows "unsaved" indicator if `isDirty`

### `ServCodePicker.tsx`

Extracted from existing `NewGroupForm` and `AssignmentGroupManager.ProgCodeServCodePicker`. Reusable component.

**Props:**
```typescript
type ServCodePickerProps = {
  existingGroupServCodeIds: Set<string>;  // excluded from picker
  selectedIds: Set<string>;
  onToggle: (servCodeId: string) => void;
  onToggleProgCode: (servCodeIds: string[]) => void;
  disabled?: boolean;
};
```

Reads `progServSelect.progCodes` and `progServSelect.servCodeMap` internally via `useSelector`.

---

## Employees Page (`/pace/setup/employees`)

### Layout

Two-panel split. Left panel fixed ~240px, right panel fills remaining space.

```
┌──────────────────┬──────────────────────────────────────────┐
│  Employees       │  John Smith                              │
│  ─────────────── │  ─────────────────────────────────────── │
│  ● John Smith  3 │  [Add Group ▼]  [Add Sequence ▼]  [📅]  │
│  ○ Jane Doe    2 │                                          │
│  ○ Bob Jones   0 │  1  ≡  LR1/LM        $1,200 /day  [✕]  │
│  ...             │  2  ≡  LR6           $1,000 /day  [✕]  │
│                  │  3  ≡  Aeration        $800 /day  [✕]  │
│  [Select Assigned│                                          │
│   employees]     │  [unsaved ●]                             │
└──────────────────┴──────────────────────────────────────────┘
```

### `SetupEmployeesPage.tsx`

- Manages `selectedEmployeeId: string | null` in local state
- Renders `EmployeeListPanel` (left) and `EmployeeAssignmentPanel` (right, only when employee selected)
- Follows page scroll convention: `<div className="flex h-full overflow-hidden">`

### `EmployeeListPanel.tsx`

- Reads `employeeSelect.employees` (active only) and `assignmentPlanSelect.assignmentsByEmployeeId`
- Each row: employee name, assigned group count badge, selected state highlight
- "Select Assigned" shortcut button at top
- Click → sets `selectedEmployeeId`

### `EmployeeAssignmentPanel.tsx`

Replaces `EmployeeAssignmentCard`. Receives `employeeId` as prop.

**Header:**
- Employee name
- Availability button (`CalendarClock`) → opens `EmployeeAvailabilitySheet` (reuse directly)
- `isDirty` indicator dot

**Toolbar:**
- `AddGroupDropdown` — dropdown list of groups not yet assigned to this employee
- `AddSequenceDropdown` — dropdown list of sequences; selecting one appends all unassigned groups from that sequence in sequence order
- Both dropdowns dispatch `paceAssignmentPlanActions.reorderGroupAssignments` to add groups

**Assignment list:**
- Draggable rows using the same pointer-event drag pattern from `GroupSequenceRow`
- Each `AssignmentRow` shows: drag handle, priority number, group label, servCode badges, goal input, remove button

**Empty state:** "No groups assigned. Use the dropdowns above to add groups."

### `AssignmentRow.tsx`

Single draggable row in the assignment list.

**Props:**
```typescript
type AssignmentRowProps = {
  groupAssignment: GroupAssignment;
  index: number;
  totalCount: number;
  group: AssignmentGroup | undefined;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: () => void;
  onGoalChange: (groupId: string, goal: number | null) => void;
  onRemove: (index: number) => void;
};
```

**Content:** drag handle (`GripVertical`), priority number, group label (font-mono, primary color), servCode badges, goal input ($/day), remove button (X).

**Goal change:** dispatches `paceAssignmentPlanActions.setGoal(...)` on blur/change.

**Remove:** dispatches `paceAssignmentPlanActions.reorderGroupAssignments(...)` with the item filtered out.

### `AddGroupDropdown.tsx`

Popover-based dropdown. Shows groups not yet in the employee's assignment array, sorted alphabetically. Clicking a group appends it to the assignment array with `dailyRevenueGoal: null`.

### `AddSequenceDropdown.tsx`

Popover-based dropdown. Shows all sequences. Clicking a sequence appends all groups from that sequence that are not already assigned, in sequence order, each with `dailyRevenueGoal: null`.

---

## Selector Changes

### New file: `src/app/pace/setup/setupSelect.ts`

Additive selectors — no changes to existing selector files.

```typescript
// Groups organized for the Setup Groups page
const selectSequencesWithGroups = createSelector(
  [paceGroupSequenceSelect.sequences, paceAssignmentGroupSelect.assignmentGroupMap],
  (sequences, groupMap) => sequences.map(sequence => ({
    ...sequence,
    groups: sequence.groupIds.map(id => groupMap.get(id)).filter(Boolean),
  }))
);

// Groups with no sequence membership
const selectStandaloneGroups = createSelector(
  [paceAssignmentGroupSelect.assignmentGroups],
  (groups) => groups.filter(g => g.sequenceId === null)
);

// Groups available to add to a specific employee (not yet assigned)
// Used by AddGroupDropdown — takes employeeId as argument, so implemented as a
// plain function called inside the component, not a parameterized selector.

export const setupSelect = {
  sequencesWithGroups: selectSequencesWithGroups,
  standaloneGroups: selectStandaloneGroups,
};
```

---

## Layout Changes

### `src/app/pace/layout.tsx`

Add "Setup" tab to `TABS`:

```tsx
{ label: "Setup", href: "/pace/setup", icon: Settings2 }
```

No other changes to `layout.tsx`.

### `src/app/pace/assignments/_components/PaceScenarioSelector.tsx`

Extend the path check so Save/Save As controls appear on the Employees setup page:

```tsx
// Before:
const isAssignmentsPage = pathname === ASSIGNMENTS_PATH;

// After:
const isAssignmentsPage =
  pathname === ASSIGNMENTS_PATH || pathname.startsWith("/pace/setup/employees");
```

This is the only change to existing components.

### `src/app/pace/setup/layout.tsx`

```tsx
"use client";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";

const SETUP_TABS: readonly TabNavItem[] = [
  { label: "Groups", href: "/pace/setup/groups" },
  { label: "Employees", href: "/pace/setup/employees" },
] as const;

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  // usePaceDeps() is already called in the parent pace layout — do not call again.
  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold text-foreground">Setup</span>}
        right={<TabNav items={SETUP_TABS} rootHref="/pace/setup" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
```

---

## Implementation Order

Execute in this order to minimize broken states:

1. **Add "Setup" tab** to `src/app/pace/layout.tsx` + create route stubs (`layout.tsx`, `page.tsx`, `groups/page.tsx`, `employees/page.tsx`) with `TempStub` content
2. **`setupSelect.ts`** — additive selectors only
3. **`ServCodePicker.tsx`** — extract from existing forms (no behavior change)
4. **`GroupDialog.tsx`** — create/edit group with sequence membership section
5. **`SequenceDialog.tsx`** — create/edit sequence with group picker + drag reorder
6. **`GroupGoalsDialog.tsx`** — per-group employee goal editor
7. **`GroupListItem.tsx`** + **`SequenceMemberRow.tsx`** + **`SequenceCard.tsx`**
8. **`SetupGroupsPage.tsx`** — wire up list + dialogs
9. **`AssignmentRow.tsx`** (draggable) + **`AddGroupDropdown.tsx`** + **`AddSequenceDropdown.tsx`**
10. **`EmployeeListPanel.tsx`** + **`EmployeeAssignmentPanel.tsx`** + **`SetupEmployeesPage.tsx`**
11. **Extend `PaceScenarioSelector`** path check
12. **Wire up `groups/page.tsx`** and **`employees/page.tsx`** (replace TempStub)

---

## Rules for Implementation

- **One component per file.** No exceptions.
- **Components read from selector files** — never from slice state directly.
- **No `useCallback` or `useMemo`** — React Compiler handles memoization.
- **No hardcoded colors** — use semantic tokens (`bg-primary`, `bg-accent`, `text-foreground`).
- **Drag-to-reorder** — use the pointer-event pattern from `GroupSequenceRow.tsx` (drag index ref + `onDragStart`/`onDragOver`/`onDrop`).
- **Dialogs** — use `Dialog` from `src/style/components/dialog.tsx`. Do not use `Modal` (GSAP-based, for complex overlays).
- **Existing components are untouched** — the Assignments page (`/pace/assignments`) continues to work exactly as before. The Setup page is additive.
- **`AssignmentGroupDoc` / `GroupSequence` / `SeasonPlan` mutations** persist immediately (call the hook action directly). No staging needed.
- **`AssignmentPlan` mutations** dispatch to Redux only. The user saves via `PaceScenarioSelector`.
- **After editing files**, run `ide_diagnostics` on modified files for fast type feedback. Run `tsc --noEmit` only for type-level changes affecting shared types.
- **Do not start the dev server** after completing a task.
