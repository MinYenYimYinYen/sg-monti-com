# Pace — Extension 01: ProgCode Grouping Implementation

## Split-Track Checklist

---

### Y1 — `paceSlice.ts`: Update state shape ✅

**Unblocks**: A1, A2

Replace `selectedServCodeId: string | null` with three new selection fields. Add `PaceSelectionSource` type.

**Deviation from plan**: None.

```typescript
// paceSlice.ts — as implemented

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";

type PaceSortMode = "byId" | "byDateRange";
type PaceSelectionSource = "progCode" | "allInProgress" | "none";

type PaceState = {
  sortMode: PaceSortMode;
  activeFilters: PaceCategory[];
  unfinishedOnly: boolean;
  selectedServCodeIds: string[];
  selectionSource: PaceSelectionSource;
  selectedProgCodeId: string | null;
};

const initialState: PaceState = {
  sortMode: "byDateRange",
  activeFilters: ["asap", "overdue", "inProgress"],
  unfinishedOnly: true,
  selectedServCodeIds: [],
  selectionSource: "none",
  selectedProgCodeId: null,
};

// Actions: setSortMode, setActiveFilters, setUnfinishedOnly,
//          setSelectedServCodeIds, setSelectionSource, setSelectedProgCodeId

export type { PaceSortMode, PaceSelectionSource };
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
```

---

### A1 — `paceStyles.ts` (new file) ✅

**Depends on**: nothing

```typescript
export const CATEGORY_BADGE_STYLES: Record<PaceCategory, string> = {
  asap:       "bg-destructive/30 text-destructive",
  overdue:    "bg-secondary/30 text-secondary",
  inProgress: "bg-primary/20 text-primary",
  notStarted: "bg-accent/20 text-accent-foreground",
  notSet:     "bg-muted/30 text-muted-foreground",
};
```

---

### A2 — `PaceListPanel.tsx` stub rewrite ✅

**Depends on**: Y1

Rewrote with new slice actions. `filteredSortedProgCodePaces` and `inProgressServCodeIds` stubbed
with empty arrays. "All In Progress" button and `ProgCodePaceItem` list rendered but inert.

---

### Y2 — `PaceType.ts`: Add `ProgCodePace` and `EmployeeShare`; extend `ServCodePace` ✅

**Unblocks**: Y3

**Deviation from plan**: `ProgCodePace` uses `unfinishedCSP` / `finishedCSP` (without the `total`
prefix) — the plan used `totalUnfinishedCSP` / `totalFinishedCSP`. The prefix was dropped during
implementation as semantically unnecessary given the type name already implies aggregation.

```typescript
export type EmployeeShare = {
  employee: Employee;
  shareCSP: CountSizePrice;
};

export type ServCodePace = {
  // ... existing fields ...
  employeeShares: EmployeeShare[];  // added
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;  // note: no "total" prefix (deviation from plan)
  finishedCSP: CountSizePrice;    // note: no "total" prefix (deviation from plan)
};
```

---

### Y3 — `paceSelect.ts`: Add all new selectors ✅

**Depends on**: Y1, Y2
**Unblocks**: A3, A4, A5, A6, A7

**Deviation from plan**: Used `typeGuard.definedArray()` utility instead of inline
`.filter((p): p is T => p !== undefined)` for cleaner undefined filtering. Functionally identical.

New selectors added:
- `selectProgCodePaces` — groups `ServCodePace[]` by progCode
- `selectFilteredSortedProgCodePaces` — filters/sorts at progCode level
- `selectInProgressServCodeIds` — all `inProgress` servCodeIds
- `selectSelectedPaces` — looks up selected ids in paceMap

`selectServCodePaces` updated to compute `employeeShares`.

---

### A3 — `ProgCodePaceItem.tsx` (new) ✅

**Depends on**: Y2, Y3

ProgCode list row: monospace id + description, servCode badges color-coded by category via
`CATEGORY_BADGE_STYLES`, aggregate `finishedCSP.count / total` count.

---

### A4 — `PaceListPanel.tsx` final ✅

**Depends on**: Y3, A3

Replaced stubs with real selectors. "All In Progress" button wired to `inProgressServCodeIds`.
`ProgCodePaceItem` list wired to `filteredSortedProgCodePaces`.

---

### A5 — `PaceDetailPanel.tsx` rewrite ✅

**Depends on**: Y2, Y3

Renders `ServCodePaceCard[]` from `paceSelect.selectedPaces`. Applies `unfinishedOnly` filter
locally. Two empty states: `selectionSource === "none"` vs. all filtered out.

---

### A6 — `ServCodePaceCard.tsx` + `ServCodeHeader.tsx` + `PaceRateDisplay.tsx` ✅

**Depends on**: Y2, Y3

- `ServCodePaceCard`: card wrapper composing the four sub-components
- `ServCodeHeader`: monospace servCodeId, longName, progCodeId, category badge
- `PaceRateDisplay`: 4-column grid (count/size/price/rev per day)

---

### A7 — `DateRangeEditor.tsx` + `AssignmentEditor.tsx` + `EmployeePaceRow.tsx` ✅

**Depends on**: Y2, Y3

- `DateRangeEditor`: local state + `useProgServ` for save; `SaveButton` with status flow
- `AssignmentEditor`: employee list with add (`EntitySelector`) and remove (×); calls `useAssignmentPlan({ autoLoad: false })`
- `EmployeePaceRow`: employee name + shareCSP (count/size/price) + remove button

---

## Status

| Task | Owner | Status | Unblocks |
|---|---|---|---|
| Y1 — `paceSlice.ts` update | Human | ✅ | A1, A2 |
| A1 — `paceStyles.ts` | AI | ✅ | — |
| A2 — `PaceListPanel` stub rewrite | AI | ✅ | — |
| Y2 — `PaceType.ts` update | Human | ✅ | Y3 |
| Y3 — `paceSelect.ts` update | Human | ✅ | A3, A4, A5, A6, A7 |
| A3 — `ProgCodePaceItem` | AI | ✅ | A4 |
| A4 — `PaceListPanel` final | AI | ✅ | — |
| A5 — `PaceDetailPanel` rewrite | AI | ✅ | — |
| A6 — `ServCodePaceCard` + `ServCodeHeader` + `PaceRateDisplay` | AI | ✅ | — |
| A7 — `DateRangeEditor` + `AssignmentEditor` + `EmployeePaceRow` | AI | ✅ | — |
