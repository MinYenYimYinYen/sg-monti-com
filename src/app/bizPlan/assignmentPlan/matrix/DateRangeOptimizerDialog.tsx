"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Info, Lock, LockOpen, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { ProgCodePace } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { paceSelect } from "@/app/bizPlan/pace/paceSelectRefactor";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";
import { dateStrings, dateRanges } from "@/lib/primatives/dates/dateStrings";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Gantt helpers — use dateStrings/dateRanges instead of raw Date arithmetic
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function ganttLeftPct(date: string, timelineMin: string, totalWeekdays: number): number {
  if (totalWeekdays <= 0 || date < timelineMin) return 0;
  const days = Math.max(0, dateRanges.countWeekdays({ min: timelineMin, max: date }) - 1);
  return Math.min(100, (days / totalWeekdays) * 100);
}

function ganttWidthPct(range: TRange<string>, totalWeekdays: number): number {
  if (totalWeekdays <= 0 || !dateRanges.isValidDateRange(range)) return 0;
  const days = Math.max(1, dateRanges.countWeekdays(range));
  return Math.min(100, (days / totalWeekdays) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type DateRangeOptimizerDialogProps = {
  progCodePace: ProgCodePace;
};

export function DateRangeOptimizerDialog({ progCodePace }: DateRangeOptimizerDialogProps) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const lookbackConfig = useSelector(paceSelect.lookbackConfig);
  const optimizerConfig = useSelector(paceSelect.optimizerConfig);
  const optimizerResult = useSelector(paceSelect.optimizerResult);
  const servCodeDocMap = useSelector(progServSelect.servCodeDocMap);
  const { updateServCode, saveServCodeChanges } = useProgServ({});

  const today = dateStrings.today();
  const progCodeId = progCodePace.progCode.progCodeId;

  // ---------------------------------------------------------------------------
  // Lookback slider — uses calendar days offset from earliestMin
  // Slider position 0 = earliestMin (longest lookback), sliderMax = today (shortest)
  // ---------------------------------------------------------------------------
  const earliestMin =
    progCodePace.servCodePaces
      .map((sp) => sp.servCode.dateRange.min)
      .filter(Boolean)
      .sort()[0] ?? today;

  const sliderTotalDays = Math.max(0, dateRanges.weekdaysBetween(earliestMin, today));
  const sliderDisabled = sliderTotalDays === 0;

  const currentSliderValue = Math.min(
    Math.max(dateRanges.weekdaysBetween(earliestMin, lookbackConfig.lookbackStart), 0),
    sliderTotalDays,
  );

  // ---------------------------------------------------------------------------
  // Gantt timeline bounds
  // ---------------------------------------------------------------------------
  const timelineMin = (() => {
    if (!optimizerResult) return today;
    const allMins = optimizerResult
      .flatMap((r) => [r.currentRange.min, r.newRange.min])
      .filter(Boolean)
      .sort();
    const earliest = allMins[0] ?? today;
    return earliest < today ? earliest : today;
  })();

  const timelineMax = (() => {
    if (!optimizerResult) return today;
    const allMaxes = optimizerResult
      .flatMap((r) => [r.currentRange.max, r.newRange.max])
      .filter(Boolean)
      .sort();
    return allMaxes.at(-1) ?? today;
  })();

  const totalGanttDays =
    dateRanges.isValidDateRange({ min: timelineMin, max: timelineMax })
      ? Math.max(1, dateRanges.countWeekdays({ min: timelineMin, max: timelineMax }))
      : 1;

  const todayLeftPct = ganttLeftPct(today, timelineMin, totalGanttDays);

  const changedItems =
    optimizerResult?.filter(
      (r) =>
        r.hasWork &&
        (r.newRange.min !== r.currentRange.min ||
          r.newRange.max !== r.currentRange.max),
    ) ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      dispatch(paceActions.openOptimizer({ progCodeId }));
    } else {
      dispatch(paceActions.closeOptimizer());
    }
    setOpen(nextOpen);
  }

  function handleCancel() {
    dispatch(paceActions.closeOptimizer());
    setOpen(false);
  }

  function handleApply() {
    for (const item of changedItems) {
      updateServCode({ servCodeId: item.servCodeId, dateRange: item.newRange });
    }
    dispatch(paceActions.closeOptimizer());
    setOpen(false);
  }

  function handleApplyAndSave() {
    const changes: UnsavedServCodeChanges[] = changedItems.flatMap((item) => {
      const doc = servCodeDocMap.get(item.servCodeId);
      if (!doc) return [];
      const original: UnsavedServCodeChanges["original"] = {
        servCodeId: doc.servCodeId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        dateRange: doc.dateRange,
        alwaysAsap: doc.alwaysAsap,
        productRuleDocs: doc.productRuleDocs,
        callAheadTag: doc.callAheadTag ?? null,
      };
      return [{ original, updated: { ...original, dateRange: item.newRange } }];
    });

    for (const item of changedItems) {
      updateServCode({ servCodeId: item.servCodeId, dateRange: item.newRange });
    }

    if (changes.length > 0) {
      saveServCodeChanges(changes);
    }

    dispatch(paceActions.closeOptimizer());
    setOpen(false);
  }

  const isActive = optimizerConfig.progCodeId === progCodeId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="text-muted-foreground hover:text-primary transition-colors"
          title={`Optimize date ranges for ${progCodeId}`}
          aria-label={`Optimize date ranges for ${progCodeId}`}
        >
          <Wand2 className="w-3 h-3" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Date Range Optimizer —{" "}
            <span className="font-mono">{progCodeId}</span>
          </DialogTitle>
        </DialogHeader>

        {isActive && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="space-y-3">
              {/* Lookback slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">
                    Lookback window start
                  </label>
                  <span className="text-xs font-mono text-foreground">
                    {lookbackConfig.lookbackStart}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {formatDate(earliestMin)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={sliderTotalDays}
                    step={1}
                    value={currentSliderValue}
                    disabled={sliderDisabled}
                    onChange={(e) => {
                      const offset = Number(e.target.value);
                      dispatch(
                        paceActions.setLookbackStart(
                          dateStrings.addWeekdays(earliestMin, offset),
                        ),
                      );
                    }}
                    className="flex-1 accent-primary"
                    aria-label="Lookback window start date"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {formatDate(today)}
                  </span>
                </div>
              </div>

              {/* Completion threshold + padding row */}
              <div className="flex items-center gap-4">
                {/* Completion threshold */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="optimizer-threshold"
                    className="text-xs text-muted-foreground whitespace-nowrap"
                  >
                    Completion threshold
                  </label>
                  <span
                    title="The minimum fraction of scheduled services that must be completed for a day to count as a valid production day in the lookback analysis. Higher = stricter (fewer valid days, but higher quality). Lower = more data points included."
                    className="text-muted-foreground cursor-help"
                  >
                    <Info className="w-3 h-3" />
                  </span>
                  <div className="flex items-center gap-0.5">
                    <input
                      id="optimizer-threshold"
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(lookbackConfig.completionThreshold * 100)}
                      onChange={(e) => {
                        const pct = Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value, 10) || 0),
                        );
                        dispatch(
                          paceActions.setLookbackCompletionThreshold(pct / 100),
                        );
                      }}
                      className="w-14 text-sm border border-border rounded px-2 py-1 bg-card text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Buffer days */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="optimizer-padding"
                    className="text-xs text-muted-foreground whitespace-nowrap"
                  >
                    Buffer days
                  </label>
                  <input
                    id="optimizer-padding"
                    type="number"
                    min={0}
                    max={30}
                    value={optimizerConfig.paddingDays}
                    onChange={(e) => {
                      dispatch(
                        paceActions.setOptimizerPaddingDays(
                          Math.max(0, parseInt(e.target.value, 10) || 0),
                        ),
                      );
                    }}
                    className="w-14 text-sm border border-border rounded px-2 py-1 bg-card text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Gantt chart */}
            {optimizerResult && optimizerResult.length > 0 ? (
              <div className="space-y-3">
                {/* Timeline header */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pl-[8rem] pr-28">
                  <span>{formatDate(timelineMin)}</span>
                  <span>{formatDate(timelineMax)}</span>
                </div>

                <div className="space-y-2">
                  {optimizerResult.map((item) => {
                    const currentLeft = ganttLeftPct(
                      item.currentRange.min,
                      timelineMin,
                      totalGanttDays,
                    );
                    const currentWidth = ganttWidthPct(item.currentRange, totalGanttDays);
                    const newLeft = item.hasWork
                      ? ganttLeftPct(item.newRange.min, timelineMin, totalGanttDays)
                      : null;
                    const newWidth = item.hasWork
                      ? ganttWidthPct(item.newRange, totalGanttDays)
                      : null;
                    const changed =
                      item.hasWork &&
                      (item.newRange.min !== item.currentRange.min ||
                        item.newRange.max !== item.currentRange.max);

                    const displayRate =
                      optimizerConfig.rateOverrides[item.servCodeId] ??
                      item.computedRatePerEmployee;
                    const isOverridden =
                      optimizerConfig.rateOverrides[item.servCodeId] != null;

                    return (
                      <div key={item.servCodeId} className="flex items-center gap-2">
                        {/* ServCode ID */}
                        <span className="font-mono text-xs text-foreground w-8 shrink-0 truncate">
                          {item.servCodeId}
                        </span>

                        {/* Rate input — price per employee per day */}
                        <div className="flex items-center gap-0.5 w-20 shrink-0">
                          <span className="text-[10px] text-muted-foreground">$</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={displayRate}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              dispatch(
                                paceActions.setOptimizerRateOverride({
                                  servCodeId: item.servCodeId,
                                  rate: val,
                                }),
                              );
                            }}
                            className={cn(
                              "w-16 text-xs border rounded px-1 py-0.5 bg-card text-center focus:outline-none focus:ring-1 focus:ring-primary",
                              isOverridden
                                ? "border-primary text-foreground"
                                : "border-border text-muted-foreground",
                            )}
                            title={`Price per employee per day (computed: $${item.computedRatePerEmployee}, ${item.assignedCount} assigned)`}
                          />
                        </div>

                        {/* Bar track */}
                        <div className="relative flex-1 h-6 bg-muted/30 rounded overflow-hidden">
                          {/* Current range — top half, muted */}
                          <div
                            className="absolute top-0.5 h-2 rounded bg-muted-foreground/35"
                            style={{
                              left: `${currentLeft}%`,
                              width: `${Math.max(currentWidth, 0.5)}%`,
                            }}
                          />
                          {/* Proposed range — bottom half */}
                          {newLeft !== null && newWidth !== null && (
                            <div
                              className={cn(
                                "absolute bottom-0.5 h-2 rounded",
                                changed ? "bg-accent" : "bg-muted-foreground/35",
                              )}
                              style={{
                                left: `${newLeft}%`,
                                width: `${Math.max(newWidth, 0.5)}%`,
                              }}
                            />
                          )}
                          {/* Today line */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-primary/50"
                            style={{ left: `${todayLeftPct}%` }}
                          />
                        </div>

                        {/* Date labels + lock toggle */}
                        {(() => {
                          const isStartLocked = !!optimizerConfig.lockedStarts[item.servCodeId];
                          return (
                            <div className="shrink-0 flex items-start gap-1 w-28">
                              {/* Lock toggle — pins dateRange.min */}
                              <button
                                onClick={() => {
                                  dispatch(
                                    paceActions.setOptimizerLockedStart({
                                      servCodeId: item.servCodeId,
                                      locked: !isStartLocked,
                                    }),
                                  );
                                }}
                                disabled={!item.hasWork}
                                className="mt-0.5 shrink-0 disabled:opacity-30"
                                title={
                                  isStartLocked
                                    ? "Unlock start date (let optimizer choose)"
                                    : "Lock start date (keep current dateRange.min)"
                                }
                                aria-label={
                                  isStartLocked ? "Unlock start date" : "Lock start date"
                                }
                              >
                                {isStartLocked ? (
                                  <Lock className="w-3 h-3 text-primary" />
                                ) : (
                                  <LockOpen className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                                )}
                              </button>
                              <div className="flex flex-col items-end text-[10px] font-mono leading-tight flex-1">
                                <span className="text-muted-foreground/50">
                                  {formatDate(item.currentRange.min)}–
                                  {formatDate(item.currentRange.max)}
                                </span>
                                {item.hasWork && changed && (
                                  <span className="text-accent">
                                    {formatDate(item.newRange.min)}–
                                    {formatDate(item.newRange.max)}
                                  </span>
                                )}
                                {item.hasWork && !changed && (
                                  <span className="text-muted-foreground/40">unchanged</span>
                                )}
                                {!item.hasWork && (
                                  <span className="text-muted-foreground/40">no work</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-1.5 rounded bg-muted-foreground/35" />
                    Current
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-1.5 rounded bg-accent" />
                    Proposed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-px h-3 bg-primary/50" />
                    Today
                  </span>
                  <span className="text-primary ml-auto">
                    Blue border on rate = overridden
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center border border-dashed border-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  No servCodes with unscheduled work
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                size="sm"
                variant="secondary"
                intensity="soft"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                intensity="soft"
                disabled={changedItems.length === 0}
                onClick={handleApply}
              >
                Apply
              </Button>
              <Button
                size="sm"
                disabled={changedItems.length === 0}
                onClick={handleApplyAndSave}
              >
                Apply &amp; Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
