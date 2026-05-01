# My Implementation Checklist

---

## Collaboration Strategy: "Owner-Split"

### Roles
- **You (human) own**: types, Redux slice state, selectors, and any backend/data layer changes
- **I (AI) own**: all UI components

### Sequencing Rule
UI is implemented as early as possible. Where UI depends on state or selectors that don't exist yet,
those become your tasks first. I write UI against the new contracts as soon as your data layer is ready.

### Handoff Protocol
1. You complete a task block (marked **[YOURS]**)
2. You signal me: "Check my work on Y1" (or whichever task)
3. I review, flag any issues, suggest corrections if needed
4. Once clean, I proceed with the UI tasks that were unblocked (marked **[MINE]**)
5. Repeat

### Task Notation
- **[YOURS]** — you implement; code snippets provided below for review
- **[MINE]** — I implement after your preceding tasks are verified
- Tasks are numbered `Y1, Y2, Y3...` (yours) and `A1, A2, A3...` (mine/AI)

---

## Task Sequence

---

### Y1 — `paceSlice.ts`: Update state shape

**Unblocks**: A1, A2

Replace `selectedServCodeId: string | null` with three new selection fields. Also add `PaceSelectionSource` type.

```typescript
// paceSlice.ts — full replacement

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

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setSortMode: (state, action: PayloadAction<PaceSortMode>) => {
      state.sortMode = action.payload;
    },
    setActiveFilters: (state, action: PayloadAction<PaceCategory[]>) => {
      state.activeFilters = action.payload;
    },
    setUnfinishedOnly: (state, action: PayloadAction<boolean>) => {
      state.unfinishedOnly = action.payload;
    },
    setSelectedServCodeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedServCodeIds = action.payload;
    },
    setSelectionSource: (state, action: PayloadAction<PaceSelectionSource>) => {
      state.selectionSource = action.payload;
    },
    setSelectedProgCodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedProgCodeId = action.payload;
    },
  },
});

export type { PaceSortMode, PaceSelectionSource };
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
```

---

### A1 — `paceStyles.ts` (new file)

**Depends on**: nothing (I can do this immediately after Y1)

I create `bizPlan/pace/paceStyles.ts` with the `CATEGORY_BADGE_STYLES` const.

---

### A2 — `PaceListPanel.tsx` rewrite (stub version)

**Depends on**: Y1

I rewrite `PaceListPanel` using the new slice actions. `filteredSortedProgCodePaces` and
`inProgressServCodeIds` are stubbed with empty arrays until Y3 is done. The "All In Progress" button
and `ProgCodePaceItem` list are rendered but inert.

---

### Y2 — `PaceType.ts`: Add `ProgCodePace` and `EmployeeShare`; extend `ServCodePace`

**Unblocks**: Y3

Add the two new types and add `employeeShares` to `ServCodePace`.

```typescript
// PaceType.ts — full replacement

import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export type PaceCategory = "asap" | "overdue" | "inProgress" | "notStarted" | "notSet";

export type EmployeeShare = {
  employee: Employee;
  shareCSP: CountSizePrice;
};

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;
  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;
  employeeShares: EmployeeShare[];
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  totalUnfinishedCSP: CountSizePrice;
  totalFinishedCSP: CountSizePrice;
};
```

---

### Y3 — `paceSelect.ts`: Add all new selectors

**Depends on**: Y1, Y2  
**Unblocks**: A3, A4, A5, A6, A7

This is the largest task. Update `selectServCodePaces` to compute `employeeShares`, and add the four
new selectors. Replace the `paceSelect` export object.

```typescript
// paceSelect.ts — full replacement

import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CountSizePriceOps } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  EmployeeShare,
  PaceCategory,
  ProgCodePace,
  ServCodePace,
} from "@/app/bizPlan/pace/PaceType";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";

function getCategory(servCode: ServCodeDeep): PaceCategory {
  if (servCode.alwaysAsap) return "asap";
  if (!dateRanges.isValidDateRange(servCode.dateRange)) return "notSet";
  const today = dateStrings.today();
  if (today < servCode.dateRange.min) return "notStarted";
  if (today > servCode.dateRange.max) return "overdue";
  return "inProgress";
}

function getCSPTotal(services: Service[]) {
  const csps = services.map((s) => CountSizePriceOps.fromService(s));
  return CountSizePriceOps.sumAll(csps);
}

const CATEGORY_URGENCY: Record<PaceCategory, number> = {
  asap: 0,
  overdue: 1,
  inProgress: 2,
  notStarted: 3,
  notSet: 4,
};

function mostUrgentCategory(categories: PaceCategory[]): PaceCategory {
  return categories.reduce((best, c) =>
    CATEGORY_URGENCY[c] < CATEGORY_URGENCY[best] ? c : best,
  );
}

// Slice selectors
const selectSortMode = (state: AppState) => state.pace.sortMode;
const selectActiveFilters = (state: AppState) => state.pace.activeFilters;
const selectUnfinishedOnly = (state: AppState) => state.pace.unfinishedOnly;
const selectSelectedServCodeIds = (state: AppState) => state.pace.selectedServCodeIds;
const selectSelectionSource = (state: AppState) => state.pace.selectionSource;
const selectSelectedProgCodeId = (state: AppState) => state.pace.selectedProgCodeId;

// ServCodePace array (now includes employeeShares)
const selectServCodePaces = createSelector(
  [deepSelect.servCodes],
  (servCodes) =>
    servCodes.map((servCode) => {
      const finished = servCode.services.filter((s) => s.status === "S");
      const finishedCSP = getCSPTotal(finished);
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      const unfinished = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      const unfinishedCSP = getCSPTotal(unfinished);
      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        servCode.x.daysRemaining,
      );

      const employeeShares: EmployeeShare[] =
        servCode.assignedTo.length > 0
          ? servCode.assignedTo.map((employee) => ({
              employee,
              shareCSP: CountSizePriceOps.divideBy(
                unfinishedCSP,
                servCode.assignedTo.length,
              ),
            }))
          : [];

      const pace: ServCodePace = {
        servCode,
        daysRemaining: servCode.x.daysRemaining,
        category: getCategory(servCode),
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
        employeeShares,
      };
      return pace;
    }),
);

const selectServCodePaceMap = createSelector([selectServCodePaces], (paces) =>
  new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

// ProgCodePace array
const selectProgCodePaces = createSelector(
  [progServSelect.progCodes, selectServCodePaceMap],
  (progCodes, paceMap): ProgCodePace[] =>
    progCodes.map((progCode) => {
      const servCodePaces = progCode.servCodes
        .map((sc) => paceMap.get(sc.servCodeId))
        .filter((p): p is ServCodePace => p !== undefined);

      const category =
        servCodePaces.length > 0
          ? mostUrgentCategory(servCodePaces.map((p) => p.category))
          : "notSet";

      const totalUnfinishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.unfinishedCSP),
      );
      const totalFinishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.finishedCSP),
      );

      return { progCode, servCodePaces, category, totalUnfinishedCSP, totalFinishedCSP };
    }),
);

// Filtered + sorted at the progCode level
const selectFilteredSortedProgCodePaces = createSelector(
  [selectProgCodePaces, selectSortMode, selectActiveFilters, selectUnfinishedOnly],
  (progCodePaces, sortMode, activeFilters, unfinishedOnly): ProgCodePace[] => {
    const filtered = progCodePaces.filter((p) => {
      const hasMatchingCategory = p.servCodePaces.some((sp) =>
        activeFilters.includes(sp.category),
      );
      if (!hasMatchingCategory) return false;
      if (unfinishedOnly && p.totalUnfinishedCSP.count === 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "byId") {
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      // byDateRange: most urgent first, then earliest dateRange.min, then alphabetical
      const urgencyA = CATEGORY_URGENCY[a.category];
      const urgencyB = CATEGORY_URGENCY[b.category];
      if (urgencyA !== urgencyB) return urgencyA - urgencyB;

      const minA =
        a.servCodePaces
          .map((p) => p.servCode.dateRange.min ?? "")
          .filter(Boolean)
          .sort()[0] ?? "";
      const minB =
        b.servCodePaces
          .map((p) => p.servCode.dateRange.min ?? "")
          .filter(Boolean)
          .sort()[0] ?? "";
      if (minA !== minB) return minA.localeCompare(minB);

      return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
    });
  },
);

// All inProgress servCodeIds — used by "All In Progress" button
const selectInProgressServCodeIds = createSelector(
  [selectServCodePaces],
  (paces) =>
    paces
      .filter((p) => p.category === "inProgress")
      .map((p) => p.servCode.servCodeId),
);

// The paces for the detail pane, in selectedServCodeIds order
const selectSelectedPaces = createSelector(
  [selectServCodePaceMap, selectSelectedServCodeIds],
  (paceMap, ids): ServCodePace[] =>
    ids
      .map((id) => paceMap.get(id))
      .filter((p): p is ServCodePace => p !== undefined),
);

export const paceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  filteredSortedProgCodePaces: selectFilteredSortedProgCodePaces,
  inProgressServCodeIds: selectInProgressServCodeIds,
  selectedPaces: selectSelectedPaces,
  selectedServCodeIds: selectSelectedServCodeIds,
  selectionSource: selectSelectionSource,
  selectedProgCodeId: selectSelectedProgCodeId,
  sortMode: selectSortMode,
  activeFilters: selectActiveFilters,
  unfinishedOnly: selectUnfinishedOnly,
};
```

---

### A3 — `ProgCodePaceItem.tsx` (new component)

**Depends on**: Y2, Y3

I create the progCode list row component with servCode badges color-coded by category.

---

### A4 — `PaceListPanel.tsx` final (wire up real selectors)

**Depends on**: Y3, A3

I replace the stubs from A2 with real selectors and wire up `ProgCodePaceItem`.

---

### A5 — `PaceDetailPanel.tsx` rewrite

**Depends on**: Y2, Y3

I rewrite the detail panel to render `ServCodePaceCard[]` filtered by `unfinishedOnly`.

---

### A6 — `ServCodePaceCard.tsx` + `ServCodeHeader.tsx` + `PaceRateDisplay.tsx`

**Depends on**: Y2, Y3

I create the card wrapper and the two simpler sub-components.

---

### A7 — `DateRangeEditor.tsx` + `AssignmentEditor.tsx` + `EmployeePaceRow.tsx`

**Depends on**: Y2, Y3

I create the interactive sub-components (date editing, employee assignment).

---

## Status

| Task | Owner | Status | Unblocks |
|---|---|---|---|
| Y1 — `paceSlice.ts` update | You | 🔲 | A1, A2 |
| A1 — `paceStyles.ts` | AI | 🔲 | — |
| A2 — `PaceListPanel` stub rewrite | AI | 🔲 | — |
| Y2 — `PaceType.ts` update | You | 🔲 | Y3 |
| Y3 — `paceSelect.ts` update | You | 🔲 | A3, A4, A5, A6, A7 |
| A3 — `ProgCodePaceItem` | AI | 🔲 | A4 |
| A4 — `PaceListPanel` final | AI | 🔲 | — |
| A5 — `PaceDetailPanel` rewrite | AI | 🔲 | — |
| A6 — `ServCodePaceCard` + `ServCodeHeader` + `PaceRateDisplay` | AI | 🔲 | — |
| A7 — `DateRangeEditor` + `AssignmentEditor` + `EmployeePaceRow` | AI | 🔲 | — |
