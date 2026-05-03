# Pace — Flag Filter + PaceDisplayConfig Plan

## Extension Index: `pace_02`

**Prerequisite:** `custFlagFilterPlan.md` in `src/app/realGreen/custFlag/docs/` must be
implemented first. The flag filter infrastructure (global `selectedFlagIds` in `custFlagSlice`,
filter in `centralSelect`) is what makes the pace list respond to flag selection — no changes to
`paceSelect` or `paceSlice` are needed.

---

## Goal

Two related improvements to `PaceListPanel`:

1. **Flag filter**: A multi-select checklist of customer flags. Selecting flags narrows the pace
   list to programs whose customers have at least one of the selected flags. Implemented via the
   global `custFlagFilter` infrastructure — pace itself does nothing special.

2. **`PaceDisplayConfig`**: A popover that consolidates all existing display controls (category
   filter, unfinished-only toggle, sort mode) plus the new flag filter into a single "Sort/Filter"
   trigger. Replaces the inline controls currently stacked at the top of `PaceListPanel`.

---

## Desired Behaviors

- **"Sort/Filter" trigger**: A button at the top of `PaceListPanel` that opens a popover. Styled
  as a dropdown trigger (label + chevron icon).
- **Popover contents** (top to bottom):
  - Category filter — `ToggleGroup` (existing, moved from `PaceListPanel`)
  - Unfinished only — `Switch` (existing, moved)
  - Sort mode — `RadioGroup` (existing, moved)
  - Flag filter — scrollable checklist of `FlagDoc[]` with checkboxes; empty selection = no filter
- **Flag selection dispatches to `custFlagSlice`**: `custFlagActions.setSelectedFlagIds(...)`.
  The global filter in `centralSelect` handles the rest — `paceSelect` needs no changes.
- **On-demand flag data loading**: `usePaceDeps` calls `useSelectedCustFlags()` (from the
  custFlagFilter infrastructure), which watches `selectedFlagIds` and loads `custFlag` data as
  needed with `custStatuses: ["9"]`.

---

## Data Sources

- `flagSelect.flagDocs` — all available flags for the checklist (already loaded via `useFlag` in
  `usePaceDeps`)
- `custFlagSelect.selectedFlagIds` — currently selected flag IDs (read by `PaceDisplayConfig` to
  show checked state)
- `paceSelect.activeFilters`, `paceSelect.sortMode`, `paceSelect.unfinishedOnly` — existing pace
  state (read by `PaceDisplayConfig` for the existing controls)

---

## State Changes

### `paceSlice.ts`

None. Flag selection lives in `custFlagSlice`.

### `paceSelect.ts`

None. Filtering happens upstream in `centralSelect` → `deepSelect` → `paceSelect` inherits it.

---

## Component Tree

```
PaceListPanel
  └── PaceDisplayConfig          ← new
        └── Popover
              ├── PopoverTrigger  ("Sort/Filter" + chevron)
              └── PopoverContent
                    ├── ToggleGroup  (category filter)
                    ├── Switch       (unfinished only)
                    ├── RadioGroup   (sort mode)
                    └── FlagChecklist (flag filter — scrollable)
```

---

## `PaceDisplayConfig.tsx` — Component Spec

**File:** `src/app/bizPlan/pace/components/PaceDisplayConfig.tsx`

**Reads from Redux:**
- `paceSelect.activeFilters` — for category ToggleGroup
- `paceSelect.unfinishedOnly` — for Switch
- `paceSelect.sortMode` — for RadioGroup
- `flagSelect.flagDocs` — for flag checklist items
- `custFlagSelect.selectedFlagIds` — for flag checklist checked state

**Dispatches:**
- `paceActions.setActiveFilters(...)` — category filter changes
- `paceActions.setUnfinishedOnly(...)` — switch changes
- `paceActions.setSortMode(...)` — sort changes
- `custFlagActions.setSelectedFlagIds(...)` — flag selection changes

**Trigger appearance:** Button with "Sort/Filter" label and a `ChevronDown` icon. Uses semantic
styling consistent with the rest of the panel (small, `variant="outline"`).

**Flag checklist behavior:**
- Renders one checkbox row per `FlagDoc` (sorted by `flagId` or `desc`)
- Checked when `flagId` is in `selectedFlagIds`
- Toggling a flag adds/removes it from `selectedFlagIds` and dispatches `setSelectedFlagIds`
- Scrollable if the list is long (max height constrained)
- Empty `selectedFlagIds` = no filter applied (all customers pass)

---

## `PaceListPanel.tsx` — Changes

Remove the inline `ToggleGroup`, `Switch`, and `RadioGroup` controls from the top of the
component. Replace with `<PaceDisplayConfig />`. The scroll list below is unchanged.

---

## `usePaceDeps.ts` — Changes

Add `useSelectedCustFlags()` call. This hook (from the custFlagFilter infrastructure) watches
`custFlagSelect.selectedFlagIds` and dispatches `loadFlagIdCustIds` for any newly selected flags
not yet in state.

`useFlag({ autoLoad: true })` is already present — no change needed.

---

## Open Questions / Decisions

- **Flag checklist sort order**: Sort flags by `flagId` (numeric) or `desc` (alphabetical)?
  Alphabetical by `desc` is more user-friendly.
- **"Clear flags" affordance**: Should there be a "Clear" button or link inside the popover to
  reset `selectedFlagIds` to `[]`? Probably yes — worth adding for UX.

---

## File Map

| File | Change |
|---|---|
| `pace/components/PaceListPanel.tsx` | Remove inline controls; add `<PaceDisplayConfig />` |
| `pace/components/PaceDisplayConfig.tsx` | **New** — popover with all controls + flag selector |
| `pace/usePaceDeps.ts` | Add `useSelectedCustFlags()` |
| `pace/docs/pace_02_flagFilterPlan.md` | **New** — this document |

**Prerequisite files (from `custFlagFilterPlan.md`):**

| File | Change |
|---|---|
| `custFlag/_lib/custFlagSlice.ts` | Add `selectedFlagIds`, `setSelectedFlagIds` |
| `custFlag/_lib/custFlagSelect.ts` | Add `selectSelectedFlagIds` |
| `customer/selectors/centralSelectors.ts` | Add flag filter to `selectCustomers` |
| `custFlag/_lib/custFlagFilterSelect.ts` | **New** — factory + pure utilities |
| `custFlag/_lib/useSelectedCustFlags.ts` | **New** — on-demand loader hook |
