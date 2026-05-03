# Pace — Flag Filter + PaceDisplayConfig Implementation

## All tasks are AI-owned. No Y-tasks.

---

## Task List

### A1 — `usePaceDeps.ts`: Add `useSelectedCustFlags` + `useFlag`

```typescript
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelectedCustFlags } from "@/app/realGreen/custFlag/_lib/useSelectedCustFlags";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const PACE_CONTEXTS: CustomerContextMode[] = ["active"];

export function usePaceDeps() {
  useCustomerContext({ contexts: PACE_CONTEXTS });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useAssignmentPlan({ autoLoad: true });
  useFlag({ autoLoad: true });
  useSelectedCustFlags();
}
```

---

### A2 — `PaceDisplayConfig.tsx`: New component

**File:** `src/app/bizPlan/pace/components/PaceDisplayConfig.tsx`

Three labeled sections inside a Popover: **Filter**, **Sort**, **Flags**.
Normal spacing (no compressed `h-6` overrides). "Clear" link appears only when flags are selected.

```tsx
"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions, PaceSortMode } from "@/app/bizPlan/pace/paceSlice";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { ScrollArea } from "@/style/components/scroll-area";
import { ChevronDown } from "lucide-react";

const FILTER_OPTIONS: { value: PaceCategory; label: string }[] = [
  { value: "asap", label: "ASAP" },
  { value: "overdue", label: "Overdue" },
  { value: "inProgress", label: "In Progress" },
  { value: "notStarted", label: "Not Started" },
  { value: "notSet", label: "Not Set" },
];

const SORT_OPTIONS: { value: PaceSortMode; label: string }[] = [
  { value: "byDateRange", label: "By Date" },
  { value: "byId", label: "By ID" },
];

export function PaceDisplayConfig() {
  const dispatch = useAppDispatch();
  const activeFilters = useSelector(paceSelect.activeFilters);
  const unfinishedOnly = useSelector(paceSelect.unfinishedOnly);
  const sortMode = useSelector(paceSelect.sortMode);
  const flagDocs = useSelector(flagSelect.flagDocs);
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);

  const sortedFlagDocs = [...flagDocs].sort((a, b) =>
    a.desc.localeCompare(b.desc),
  );

  function handleFilterChange(values: string[]) {
    dispatch(paceActions.setActiveFilters(values as PaceCategory[]));
  }

  function handleSortChange(value: string) {
    dispatch(paceActions.setSortMode(value as PaceSortMode));
  }

  function handleFlagToggle(flagId: number) {
    const next = selectedFlagIds.includes(flagId)
      ? selectedFlagIds.filter((id) => id !== flagId)
      : [...selectedFlagIds, flagId];
    dispatch(custFlagActions.setSelectedFlagIds(next));
  }

  function handleClearFlags() {
    dispatch(custFlagActions.setSelectedFlagIds([]));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          Sort / Filter
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-5" align="start">

        {/* Filter section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filter
          </p>
          <ToggleGroup
            type="multiple"
            value={activeFilters}
            onValueChange={handleFilterChange}
            className="flex-wrap justify-start gap-1"
            variant="outline"
          >
            {FILTER_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <Switch
              id="unfinished-only"
              checked={unfinishedOnly}
              onCheckedChange={(checked) =>
                dispatch(paceActions.setUnfinishedOnly(checked))
              }
            />
            <Label htmlFor="unfinished-only" className="cursor-pointer">
              Unfinished only
            </Label>
          </div>
        </div>

        {/* Sort section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sort
          </p>
          <RadioGroup
            variant="button-group"
            value={sortMode}
            onValueChange={handleSortChange}
            className="self-start"
          >
            {SORT_OPTIONS.map((opt) => (
              <RadioGroupItem key={opt.value} value={opt.value}>
                {opt.label}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </div>

        {/* Flags section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Flags
            </p>
            {selectedFlagIds.length > 0 && (
              <button
                onClick={handleClearFlags}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {sortedFlagDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No flags available</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2 pr-2">
                {sortedFlagDocs.map((flag) => (
                  <div key={flag.flagId} className="flex items-center gap-2">
                    <Checkbox
                      id={`flag-${flag.flagId}`}
                      checked={selectedFlagIds.includes(flag.flagId)}
                      onCheckedChange={() => handleFlagToggle(flag.flagId)}
                    />
                    <Label
                      htmlFor={`flag-${flag.flagId}`}
                      className="cursor-pointer font-normal"
                    >
                      {flag.desc}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

      </PopoverContent>
    </Popover>
  );
}
```

---

### A3 — `PaceListPanel.tsx`: Remove inline controls, add `<PaceDisplayConfig />`

Remove the `ToggleGroup`, `Switch`/`Label`, and `RadioGroup` blocks (and their now-unused
imports). Replace with `<PaceDisplayConfig />`. The `ScrollArea` list below is unchanged.

Also remove the now-unused `handleFilterChange` and `handleSortChange` functions, and the
`activeFilters`, `sortMode`, `unfinishedOnly` selectors (they move into `PaceDisplayConfig`).

```tsx
"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { ProgCodePaceItem } from "@/app/bizPlan/pace/components/ProgCodePaceItem";
import { PaceDisplayConfig } from "@/app/bizPlan/pace/components/PaceDisplayConfig";
import { ScrollArea } from "@/style/components/scroll-area";
import { cn } from "@/style/utils";

function useSelectProgCode() {
  const dispatch = useAppDispatch();
  return (progCodeId: string, servCodeIds: string[]) => {
    dispatch(paceActions.setSelectedServCodeIds(servCodeIds));
    dispatch(paceActions.setSelectionSource("progCode"));
    dispatch(paceActions.setSelectedProgCodeId(progCodeId));
  };
}

function useSelectAllInProgress() {
  const dispatch = useAppDispatch();
  return (servCodeIds: string[]) => {
    dispatch(paceActions.setSelectedServCodeIds(servCodeIds));
    dispatch(paceActions.setSelectionSource("allInProgress"));
    dispatch(paceActions.setSelectedProgCodeId(null));
  };
}

export function PaceListPanel() {
  const selectionSource = useSelector(paceSelect.selectionSource);
  const selectedProgCodeId = useSelector(paceSelect.selectedProgCodeId);
  const progCodePaces = useSelector(paceSelect.filteredSortedProgCodePaces);
  const activeServCodeIds = useSelector(paceSelect.activeServCodeIds);

  const selectProgCode = useSelectProgCode();
  const selectAllInProgress = useSelectAllInProgress();

  const allInProgressSelected = selectionSource === "allInProgress";

  return (
    <div className="w-100 shrink-0 flex flex-col gap-2 h-full">
      <PaceDisplayConfig />

      {/* List */}
      <ScrollArea className="rounded-md border bg-popover flex-1 min-h-0">
        <div className="p-1 space-y-0.5">
          {/* "All Active" pseudo-item */}
          <button
            onClick={() => selectAllInProgress(activeServCodeIds)}
            className={cn(
              "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
              allInProgressSelected
                ? "bg-primary/15 border-primary/30"
                : "hover:bg-accent/10 border-transparent",
            )}
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-xs shrink-0 text-foreground">
                All Active
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {activeServCodeIds.length} service code
              {activeServCodeIds.length !== 1 ? "s" : ""}
            </div>
          </button>

          {/* ProgCode items */}
          {progCodePaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No programs match the current filters
            </p>
          ) : (
            progCodePaces.map((pace) => (
              <ProgCodePaceItem
                key={pace.progCode.progCodeId}
                pace={pace}
                isSelected={
                  selectionSource === "progCode" &&
                  selectedProgCodeId === pace.progCode.progCodeId
                }
                onSelectAction={selectProgCode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

---

## Status Table

| Task | Owner | Status | Depends On |
|------|-------|--------|------------|
| A1 — `usePaceDeps.ts`: add `useFlag` + `useSelectedCustFlags` | AI | ✅ | — |
| A2 — `PaceDisplayConfig.tsx` (new) | AI | ✅ | — |
| A3 — `PaceListPanel.tsx`: remove inline controls, add `<PaceDisplayConfig />` | AI | ✅ | A2 |
