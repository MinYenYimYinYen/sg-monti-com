# Pace — Extension 01: ProgCode Grouping Plan

## Goal

Extend the Pace feature to group service codes by program code in the list panel, add an "All In
Progress" view, and implement the full detail pane with per-servCode cards.

---

## Motivation

The original list panel exposed `ServCode` items individually. In the real world, service codes
within a program code are executed sequentially — so the natural unit of selection is the
`ProgCode`, not the individual `ServCode`. Selecting a program reveals its service codes in the
detail pane in order.

A second view — "All In Progress" — lets the user see all currently active service codes across
all programs in one place.

---

## UX

### List Panel

- **"All In Progress"** pseudo-item at the top of the list (same visual shape as a progCode item)
  - Clicking it selects all `inProgress` servCodes across all programs
  - Highlighted when active
- **ProgCode items** below, filtered and sorted
  - Each item shows: `progCodeId` (monospace) — `description`, servCode badges (color-coded by
    category), aggregate `finishedCSP.count / total`
  - Clicking selects all servCodes within that progCode
- **Filtering**: a progCode appears if any of its servCodes match the active category filters
- **`unfinishedOnly`**: a progCode appears if any of its servCodes have remaining work
- **Sorting**: same `byId` / `byDateRange` logic, applied at the progCode level

### Detail Panel

- Renders one `ServCodePaceCard` per selected servCode, in order
- `unfinishedOnly` filter applied locally: completed servCodes hidden when toggle is on
- Empty states: nothing selected vs. all filtered out

### `ServCodePaceCard`

Each card contains:
1. **`ServCodeHeader`**: servCodeId, longName, progCodeId, category badge
2. **`DateRangeEditor`**: date range display + edit + save (via `useProgServ`)
3. **`PaceRateDisplay`**: required daily pace (count/size/price/rev per day)
4. **`AssignmentEditor`**: employee list with add/remove (via `useAssignmentPlan`)

---

## Data Model

### New types (in `PaceType.ts`)

```typescript
type EmployeeShare = {
  employee: Employee;
  shareCSP: CountSizePrice;  // unfinishedCSP / assignedTo.length (even distribution)
};

// ServCodePace gains:
employeeShares: EmployeeShare[];

type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];  // ordered by natural servCode order
  category: PaceCategory;         // most urgent among servCodePaces
  unfinishedCSP: CountSizePrice;  // aggregate
  finishedCSP: CountSizePrice;    // aggregate
};
```

**Category urgency order**: `asap` > `overdue` > `inProgress` > `notStarted` > `notSet`

### Shared style constant (new file `paceStyles.ts`)

```typescript
const CATEGORY_BADGE_STYLES: Record<PaceCategory, string> = {
  asap:       "bg-destructive/30 text-destructive",
  overdue:    "bg-secondary/30 text-secondary",
  inProgress: "bg-primary/20 text-primary",
  notStarted: "bg-accent/20 text-accent-foreground",
  notSet:     "bg-muted/30 text-muted-foreground",
};
```

---

## State (`paceSlice.ts`)

Replace `selectedServCodeId: string | null` with three fields:

```typescript
type PaceSelectionSource = "progCode" | "allInProgress" | "none";

// Added to PaceState:
selectedServCodeIds: string[];        // the actual set used by the detail pane
selectionSource: PaceSelectionSource; // which list item is highlighted
selectedProgCodeId: string | null;    // which progCode is highlighted
```

**Rationale for `selectionSource`**: avoids fragile set comparison to determine which list item
is active. The list panel dispatches all three fields atomically on click.

---

## Selectors (`paceSelect.ts`)

New selectors:
- `selectProgCodePaces` — groups `ServCodePace[]` by progCode
- `selectFilteredSortedProgCodePaces` — filters/sorts at progCode level
- `selectInProgressServCodeIds` — all `inProgress` servCodeIds (used by "All In Progress" button)
- `selectSelectedPaces` — looks up `selectedServCodeIds` in `servCodePaceMap`

Updated:
- `selectServCodePaces` — now computes `employeeShares` per servCode

---

## Component Tree

```
PaceListPanel
  ├── "All In Progress" button (pseudo-item)
  └── ProgCodePaceItem[] (one per filtered/sorted ProgCodePace)

PaceDetailPanel
  └── ServCodePaceCard[] (one per selected ServCodePace, filtered by unfinishedOnly)
        ├── ServCodeHeader
        ├── DateRangeEditor
        ├── PaceRateDisplay
        └── AssignmentEditor
              └── EmployeePaceRow[]
```

---

## Files

| File | Change |
|---|---|
| `PaceType.ts` | Add `EmployeeShare`, `ProgCodePace`; extend `ServCodePace` |
| `paceStyles.ts` | New — `CATEGORY_BADGE_STYLES` |
| `paceSlice.ts` | Replace selection state; add `PaceSelectionSource` |
| `paceSelect.ts` | Add 4 new selectors; update `selectServCodePaces` |
| `PaceListPanel.tsx` | Rewrite — progCode grouping + "All In Progress" |
| `PaceListItem.tsx` | Remove — replaced by `ProgCodePaceItem` |
| `ProgCodePaceItem.tsx` | New — progCode list row |
| `PaceDetailPanel.tsx` | Rewrite — renders `ServCodePaceCard[]` |
| `ServCodePaceCard.tsx` | New — card wrapper |
| `ServCodeHeader.tsx` | New — identity display |
| `DateRangeEditor.tsx` | New — date range edit + save |
| `PaceRateDisplay.tsx` | New — required daily pace display |
| `AssignmentEditor.tsx` | New — employee assignment list |
| `EmployeePaceRow.tsx` | New — single employee row |
