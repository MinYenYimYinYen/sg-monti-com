"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import {
  paceActions,
  PaceSelectionSource,
  PaceSortMode,
} from "@/app/bizPlan/pace/paceSlice";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { ProgCodePaceItem } from "@/app/bizPlan/pace/components/ProgCodePaceItem";
import { ScrollArea } from "@/style/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";
import { cn } from "@/style/utils";

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
  const dispatch = useAppDispatch();
  const activeFilters = useSelector(paceSelect.activeFilters);
  const sortMode = useSelector(paceSelect.sortMode);
  const unfinishedOnly = useSelector(paceSelect.unfinishedOnly);
  const selectionSource = useSelector(paceSelect.selectionSource);
  const selectedProgCodeId = useSelector(paceSelect.selectedProgCodeId);
  const progCodePaces = useSelector(paceSelect.filteredSortedProgCodePaces);
  const inProgressServCodeIds = useSelector(paceSelect.inProgressServCodeIds);

  const selectProgCode = useSelectProgCode();
  const selectAllInProgress = useSelectAllInProgress();

  function handleFilterChange(values: string[]) {
    dispatch(paceActions.setActiveFilters(values as PaceCategory[]));
  }

  function handleSortChange(value: string) {
    dispatch(paceActions.setSortMode(value as PaceSortMode));
  }

  const allInProgressSelected = selectionSource === "allInProgress";

  return (
    <div className="w-72 shrink-0 flex flex-col gap-2 h-full">
      {/* Filter */}
      <ToggleGroup
        type="multiple"
        value={activeFilters}
        onValueChange={handleFilterChange}
        className="flex-wrap justify-start gap-1"
        size="sm"
        variant="outline"
      >
        {FILTER_OPTIONS.map((opt) => (
          <ToggleGroupItem key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Unfinished only toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="unfinished-only"
          checked={unfinishedOnly}
          onCheckedChange={(checked) =>
            dispatch(paceActions.setUnfinishedOnly(checked))
          }
        />
        <Label htmlFor="unfinished-only" className="text-xs cursor-pointer">
          Unfinished only
        </Label>
      </div>

      {/* Sort */}
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

      {/* List */}
      <ScrollArea className="rounded-md border bg-popover flex-1 min-h-0">
        <div className="p-1 space-y-0.5">
          {/* "All In Progress" pseudo-item */}
          <button
            onClick={() => selectAllInProgress(inProgressServCodeIds)}
            className={cn(
              "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
              allInProgressSelected
                ? "bg-primary/15 border-primary/30"
                : "hover:bg-accent/10 border-transparent",
            )}
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-xs shrink-0 text-foreground">
                All In Progress
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {inProgressServCodeIds.length} service code
              {inProgressServCodeIds.length !== 1 ? "s" : ""}
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
