"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { paceActions, MatrixCspDisplay, MatrixSortKey } from "@/app/bizPlan/pace/paceSlice";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Slider } from "@/style/components/slider";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/style/utils";

const ALL_CATEGORIES: PaceCategory[] = [
  "asap",
  "overdue",
  "inProgress",
  "notStarted",
  "notSet",
];

const CATEGORY_LABELS: Record<PaceCategory, string> = {
  asap: "ASAP",
  overdue: "Overdue",
  inProgress: "In Progress",
  notStarted: "Not Started",
  notSet: "Not Set",
};

const SORT_OPTIONS: { value: MatrixSortKey; label: string }[] = [
  { value: "dateRange", label: "Date Range" },
  { value: "assignedCount", label: "Assigned Count" },
  { value: "count", label: "Count" },
  { value: "size", label: "Size" },
  { value: "price", label: "Price" },
  { value: "rev", label: "Revenue" },
];

const CSP_DISPLAY_OPTIONS: { value: MatrixCspDisplay; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "perDay", label: "Per Day" },
  { value: "perDayPerEmployee", label: "Per Day / Employee" },
];

export function MatrixDisplaySettings() {
  const dispatch = useAppDispatch();
  const config = useSelector(paceSelect.matrixDisplayConfig);
  const [boundsMin, boundsMax] = useSelector(paceSelect.matrixDeltaDaysBounds);

  const deltaEnabled = config.filterDeltaDays != null;
  const deltaRange = config.filterDeltaDays ?? [boundsMin, boundsMax];

  function toggleCategory(cat: PaceCategory) {
    const current = config.filterCategories;
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    dispatch(paceActions.setMatrixFilterCategories(next));
  }

  function toggleDeltaFilter() {
    if (deltaEnabled) {
      dispatch(paceActions.setMatrixFilterDeltaDays(null));
    } else {
      dispatch(paceActions.setMatrixFilterDeltaDays([boundsMin, boundsMax]));
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-border bg-card hover:bg-accent/10 transition-colors text-foreground">
          <SlidersHorizontal className="w-3 h-3" />
          Display Settings
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4 text-xs">
        {/* Sort */}
        <section>
          <p className="font-semibold text-foreground mb-1.5 uppercase tracking-wide text-[10px]">
            Sort
          </p>
          <div className="flex flex-wrap gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch(paceActions.setMatrixSortKey(opt.value))}
                className={cn(
                  "px-2 py-0.5 rounded border text-[11px] transition-colors",
                  config.sortKey === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-accent/10",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Filter */}
        <section>
          <p className="font-semibold text-foreground mb-1.5 uppercase tracking-wide text-[10px]">
            Filter
          </p>

          {/* Assigned filter */}
          <div className="mb-2">
            <p className="text-muted-foreground mb-1">Assigned</p>
            <div className="flex gap-1">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "withAssigned", label: "With Assigned" },
                  { value: "withoutAssigned", label: "Without Assigned" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    dispatch(paceActions.setMatrixFilterAssigned(opt.value))
                  }
                  className={cn(
                    "px-2 py-0.5 rounded border text-[11px] transition-colors",
                    config.filterAssigned === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:bg-accent/10",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-2">
            <p className="text-muted-foreground mb-1">
              Category{" "}
              <span className="text-[10px]">
                (empty = show all)
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {ALL_CATEGORIES.map((cat) => {
                const active = config.filterCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-accent/10",
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delta days filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-muted-foreground">
                Pace Delta (days)
              </p>
              <button
                onClick={toggleDeltaFilter}
                className={cn(
                  "px-2 py-0.5 rounded border text-[11px] transition-colors",
                  deltaEnabled
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-accent/10",
                )}
              >
                {deltaEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {deltaEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{deltaRange[0]}d</span>
                  <span className="text-center text-foreground">
                    {deltaRange[0]} → {deltaRange[1]}
                  </span>
                  <span>{deltaRange[1]}d</span>
                </div>
                <Slider
                  min={boundsMin}
                  max={boundsMax}
                  step={1}
                  value={deltaRange}
                  onValueChange={(value) =>
                    dispatch(
                      paceActions.setMatrixFilterDeltaDays(
                        value as [number, number],
                      ),
                    )
                  }
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>← Ahead</span>
                  <span>Behind →</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Display */}
        <section>
          <p className="font-semibold text-foreground mb-1.5 uppercase tracking-wide text-[10px]">
            Display
          </p>
          <div className="flex gap-1">
            {CSP_DISPLAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  dispatch(paceActions.setMatrixCspDisplay(opt.value))
                }
                className={cn(
                  "px-2 py-0.5 rounded border text-[11px] transition-colors",
                  config.cspDisplay === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-accent/10",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}
