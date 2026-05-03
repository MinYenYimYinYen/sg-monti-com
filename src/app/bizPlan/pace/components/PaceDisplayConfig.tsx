"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions, PaceSortMode } from "@/app/bizPlan/pace/paceSlice";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { ScrollArea } from "@/style/components/scroll-area";
import { ChevronDown, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          Sort / Filter
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
      >
        {/* bg-popover provides opaque base; bg-accent/20 tints on top without bleed-through */}
        <div className="bg-popover">
          <div className="bg-accent/20">

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold">Sort / Filter</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-5">

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
                  <p className="text-xs text-muted-foreground">
                    No flags available
                  </p>
                ) : (
                  <div className="h-48 rounded-md bg-accent/25">
                    <ScrollArea className="h-full p-2">
                      <div className="space-y-2 pr-2">
                        {sortedFlagDocs.map((flag) => (
                          <div
                            key={flag.flagId}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`flag-${flag.flagId}`}
                              checked={selectedFlagIds.includes(flag.flagId)}
                              onCheckedChange={() =>
                                handleFlagToggle(flag.flagId)
                              }
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
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

