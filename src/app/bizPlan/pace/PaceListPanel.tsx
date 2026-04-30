"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions, PaceSortMode } from "@/app/bizPlan/pace/paceSlice";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { PaceListItem } from "@/app/bizPlan/pace/PaceListItem";
import { ScrollArea } from "@/style/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";

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

export function PaceListPanel() {
  const dispatch = useAppDispatch();
  const paces = useSelector(paceSelect.filteredSortedPaces);
  const activeFilters = useSelector(paceSelect.activeFilters);
  const sortMode = useSelector(paceSelect.sortMode);
  const unfinishedOnly = useSelector(paceSelect.unfinishedOnly);
  const selectedServCodeId = useSelector(paceSelect.selectedServCodeId);

  function handleFilterChange(values: string[]) {
    dispatch(paceActions.setActiveFilters(values as PaceCategory[]));
  }

  function handleSortChange(value: string) {
    dispatch(paceActions.setSortMode(value as PaceSortMode));
  }

  function handleSelect(servCodeId: string) {
    dispatch(paceActions.setSelectedServCodeId(servCodeId));
  }

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
      <ScrollArea
        className="rounded-md border bg-popover flex-1 min-h-0"
      >
        <div className="p-1 space-y-0.5">
          {paces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service codes match the current filters
            </p>
          ) : (
            paces.map((pace) => (
              <PaceListItem
                key={pace.servCode.servCodeId}
                pace={pace}
                isSelected={selectedServCodeId === pace.servCode.servCodeId}
                onSelectAction={handleSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
