"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CalendarRange, Info, Lock, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/style/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { AppState } from "@/store";
import { matrixSelect } from "@/app/bizPlan/pace/selectors/matrixSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { SeasonOptimizedRange } from "@/app/bizPlan/pace/PaceTypes";
import { paceActions } from "@/app/bizPlan/pace/slices/paceSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import {
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { UnsavedServCodeChanges, UnsavedProgCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";
import { dateStrings, dateRanges } from "@/lib/primatives/dates/dateStrings";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Gantt helpers
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

function formatDollars(n: number): string {
  return `$${Math.round(n)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeasonOptimizerDialog() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const lookbackConfig = useSelector(cascadeSelect.lookbackConfig);
  const seasonResult = useSelector(matrixSelect.seasonOptimizerResult);
  const progCodePaces = useSelector(servCodePaceSelect.progCodePaces);
  const servCodePaceMap = useSelector(servCodePaceSelect.servCodePaceMap);
  const servCodeDocMap = useSelector(progServSelect.servCodeDocMap);
  const unsavedProgCodeChanges = useSelector((state: AppState) => state.progServ.unsavedProgCodeChanges);
  const { updateServCode, updateProgCode, revertProgCode, saveServCodeChanges, saveProgCodeChanges } = useProgServ({});

  const today = dateStrings.today();

  // ── Local "what-if" state — not persisted ──
  const [localPadding, setLocalPadding] = useState<Record<string, number>>({});
  const [toggledProgCodes, setToggledProgCodes] = useState<Set<string>>(new Set());
  /**
   * Per-progCode rate increase fraction. 0.0 = no change, 0.10 = 10% faster.
   * Stored as decimal; displayed as percent (×100).
   */
  const [rateIncreaseFrac, setRateIncreaseFrac] = useState<Record<string, number>>({});

  // Lookback slider
  const allMins = progCodePaces.flatMap((p) =>
    p.servCodePaces.map((sp) => sp.servCode.dateRange.min),
  ).filter(Boolean).sort();
  const earliestMin = allMins[0] ?? today;
  const sliderTotalDays = Math.max(0, dateRanges.weekdaysBetween(earliestMin, today));
  const currentSliderValue = Math.min(
    Math.max(dateRanges.weekdaysBetween(earliestMin, lookbackConfig.lookbackStart), 0),
    sliderTotalDays,
  );

  // ---------------------------------------------------------------------------
  // effectiveResult — full re-computation with overrides + sequential chaining
  //
  // Rather than mapping each item independently (which breaks sequential cursor
  // propagation when padding/rate changes), we walk the full seasonResult array
  // in order, applying overrides and re-chaining the cursor per progCode.
  // ---------------------------------------------------------------------------
  const effectiveResult: SeasonOptimizedRange[] = (() => {
    const result: SeasonOptimizedRange[] = [];
    const cursors = new Map<string, string | null>(); // progCodeId → sequential cursor

    for (const item of seasonResult) {
      const paddingOverride = localPadding[item.progCodeId];
      const rateOverride = rateIncreaseFrac[item.progCodeId] ?? 0;
      const scaleFactor = Math.max(1e-6, 1 + rateOverride); // avoid div-by-zero
      const effectivePadding = paddingOverride ?? item.paddingDays;

      // Determine proposedMin for sequential progCodes.
      // When a cursor is set (we've processed at least one prior servCode in this progCode),
      // always use it — even when it's earlier than item.proposedMin (rate speedup case).
      // The cascade's item.proposedMin is stale when a rate override is active, since it
      // was computed with the original (slower) rates. The cursor correctly chains from
      // the accelerated end of the previous servCode.
      // When no cursor is set yet (first servCode), fall back to item.proposedMin.
      let proposedMin = item.proposedMin;
      if (item.runsInSequence && !item.isStarted) {
        const cursor = cursors.get(item.progCodeId) ?? null;
        if (cursor !== null) {
          proposedMin = cursor;
        }
      }

      // Determine proposedMax: scale drain time by rate factor, then add padding
      let proposedMax: string;
      if (item.hasWork && item.projectedEndDate) {
        const daysFromStart = Math.max(
          1,
          dateRanges.weekdaysBetween(proposedMin, item.projectedEndDate),
        );
        const scaledDays = Math.ceil(daysFromStart / scaleFactor);
        const drainDate = dateStrings.addWeekdays(proposedMin, scaledDays);
        proposedMax = dateStrings.addWeekdays(drainDate, effectivePadding);
      } else {
        proposedMax = item.currentRange.max;
      }

      // Advance sequential cursor past this item's proposedMax
      if (item.runsInSequence && item.hasWork) {
        cursors.set(item.progCodeId, dateStrings.addWeekdays(proposedMax, 1));
      }

      result.push({ ...item, proposedMin, proposedMax, paddingDays: effectivePadding });
    }

    return result;
  })();

  const changedItems = effectiveResult.filter(
    (r) => r.hasWork && (r.proposedMin !== r.currentRange.min || r.proposedMax !== r.currentRange.max),
  );

  // Group by progCode
  const byProgCode = new Map<string, SeasonOptimizedRange[]>();
  for (const item of effectiveResult) {
    const existing = byProgCode.get(item.progCodeId) ?? [];
    existing.push(item);
    byProgCode.set(item.progCodeId, existing);
  }

  // Gantt timeline
  const timelineMin = (() => {
    const allMinsR = effectiveResult.flatMap((r) => [r.currentRange.min, r.proposedMin]).filter(Boolean).sort();
    const earliest = allMinsR[0] ?? today;
    return earliest < today ? earliest : today;
  })();
  const timelineMax = (() => {
    const allMaxes = effectiveResult.flatMap((r) => [r.currentRange.max, r.proposedMax]).filter(Boolean).sort();
    return allMaxes.at(-1) ?? today;
  })();
  const totalGanttDays = dateRanges.isValidDateRange({ min: timelineMin, max: timelineMax })
    ? Math.max(1, dateRanges.countWeekdays({ min: timelineMin, max: timelineMax }))
    : 1;
  const todayPct = ganttLeftPct(today, timelineMin, totalGanttDays);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) {
      dispatch(paceActions.openSeasonOptimizer());
      setLocalPadding({});
      setRateIncreaseFrac({});
      setToggledProgCodes(new Set());
    } else {
      for (const progCodeId of toggledProgCodes) {
        revertProgCode(progCodeId);
      }
      dispatch(paceActions.closeSeasonOptimizer());
      setLocalPadding({});
      setRateIncreaseFrac({});
      setToggledProgCodes(new Set());
    }
    setOpen(nextOpen);
  }

  function handleApplyAndSave() {
    const servChanges: UnsavedServCodeChanges[] = [];

    for (const item of changedItems) {
      const doc = servCodeDocMap.get(item.servCodeId);
      if (!doc) continue;
      const newRange: TRange<string> = { min: item.proposedMin, max: item.proposedMax };
      const effectivePadding = localPadding[item.progCodeId] ?? doc.paddingDays;
      const original: UnsavedServCodeChanges["original"] = {
        servCodeId: doc.servCodeId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        dateRange: doc.dateRange,
        alwaysAsap: doc.alwaysAsap,
        productRuleDocs: doc.productRuleDocs,
        callAheadTag: doc.callAheadTag ?? null,
        paddingDays: doc.paddingDays,
      };
      servChanges.push({ original, updated: { ...original, dateRange: newRange, paddingDays: effectivePadding } });
      updateServCode({ servCodeId: item.servCodeId, dateRange: newRange, paddingDays: effectivePadding });
    }

    // Pure paddingDays-only changes
    for (const [progCodeId, padding] of Object.entries(localPadding)) {
      const items = byProgCode.get(progCodeId) ?? [];
      for (const item of items) {
        if (changedItems.find((c) => c.servCodeId === item.servCodeId)) continue;
        const doc = servCodeDocMap.get(item.servCodeId);
        if (!doc || doc.paddingDays === padding) continue;
        const original: UnsavedServCodeChanges["original"] = {
          servCodeId: doc.servCodeId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          dateRange: doc.dateRange,
          alwaysAsap: doc.alwaysAsap,
          productRuleDocs: doc.productRuleDocs,
          callAheadTag: doc.callAheadTag ?? null,
          paddingDays: doc.paddingDays,
        };
        servChanges.push({ original, updated: { ...original, paddingDays: padding } });
        updateServCode({ servCodeId: item.servCodeId, paddingDays: padding });
      }
    }

    const progChanges: UnsavedProgCodeChanges[] = [...unsavedProgCodeChanges];
    if (servChanges.length > 0) saveServCodeChanges(servChanges);
    if (progChanges.length > 0) saveProgCodeChanges(progChanges);

    dispatch(paceActions.closeSeasonOptimizer());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1 text-[10px] bg-accent/20 hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors"
          title="Optimize Season — compute proposed date ranges from cascade projections"
        >
          <CalendarRange className="w-3 h-3" />
          Optimize Season
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Season Optimizer</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Global controls */}
          <div className="space-y-3">
            {/* Lookback slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Lookback window start</label>
                <span className="text-xs font-mono text-foreground">{lookbackConfig.lookbackStart}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{formatDate(earliestMin)}</span>
                <input
                  type="range" min={0} max={sliderTotalDays} step={1} value={currentSliderValue}
                  disabled={sliderTotalDays === 0}
                  onChange={(e) => dispatch(paceActions.setLookbackStart(dateStrings.addWeekdays(earliestMin, Number(e.target.value))))}
                  className="flex-1 accent-primary"
                />
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">{formatDate(today)}</span>
              </div>
            </div>

            {/* Completion threshold */}
            <div className="flex items-center gap-2">
              <label htmlFor="season-threshold" className="text-xs text-muted-foreground whitespace-nowrap">
                Completion threshold
              </label>
              <span
                title="Minimum fraction of scheduled services that must be completed for a day to count as a valid production day."
                className="text-muted-foreground cursor-help"
              >
                <Info className="w-3 h-3" />
              </span>
              <input
                id="season-threshold" type="number" min={0} max={100} step={5}
                value={Math.round(lookbackConfig.completionThreshold * 100)}
                onChange={(e) => dispatch(paceActions.setLookbackCompletionThreshold(
                  Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100,
                ))}
                className="w-14 text-sm border border-border rounded px-2 py-1 bg-card text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Timeline header */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
            <span>{formatDate(timelineMin)}</span>
            <span className="text-primary">{changedItems.length} change{changedItems.length !== 1 ? "s" : ""}</span>
            <span>{formatDate(timelineMax)}</span>
          </div>

          {/* ProgCode groups */}
          {[...byProgCode.entries()]
            .filter(([, items]) => items.some((r) => r.hasWork))
            .map(([progCodeId, items]) => {
              const progCodePace = progCodePaces.find((p) => p.progCode.progCodeId === progCodeId);
              if (!progCodePace) return null;
              const currentRunsInSequence = progCodePace.progCode.runsInSequence;
              const currentPadding = localPadding[progCodeId] ?? items[0]?.paddingDays ?? 0;
              const currentRateFrac = rateIncreaseFrac[progCodeId] ?? 0;
              const visibleItems = items.filter((r) => r.hasWork);

              // Team rate: average teamAvgCapacity across visible servCodes
              const teamRates = visibleItems.map((item) =>
                servCodePaceMap.get(item.servCodeId)?.teamAvgCapacity ?? { ...baseCountSizePrice },
              );
              const teamAvgRate = teamRates.length > 0
                ? CountSizePriceOps.divideBy(CountSizePriceOps.sumAll(teamRates), teamRates.length)
                : null;

              // Per-employee rates for popover: average dailyRate.price across the servCodes
              // each employee appears in (sequential progCode — they work one servCode at a time).
              type EmployeeRateEntry = { name: string; totalPrice: number; count: number };
              const employeeRateMap = new Map<string, EmployeeRateEntry>();
              for (const item of visibleItems) {
                const pace = servCodePaceMap.get(item.servCodeId);
                if (!pace) continue;
                for (const share of pace.employeeShares) {
                  const rate = share.isEstimated ? 0 : share.dailyRate.price;
                  const existing = employeeRateMap.get(share.employee.employeeId);
                  if (existing) {
                    existing.totalPrice += rate;
                    existing.count += 1;
                  } else {
                    employeeRateMap.set(share.employee.employeeId, {
                      name: share.employee.name,
                      totalPrice: rate,
                      count: 1,
                    });
                  }
                }
              }
              const perEmployeeRates = [...employeeRateMap.values()]
                .map((e) => ({ name: e.name, avgPricePerDay: e.count > 0 ? e.totalPrice / e.count : 0 }))
                .sort((a, b) => b.avgPricePerDay - a.avgPricePerDay);
              const scaleFactor = 1 + currentRateFrac;

              return (
                <div key={progCodeId} className="space-y-1">
                  {/* ProgCode header */}
                  <div className="flex items-center gap-2 px-1 py-0.5 bg-accent/10 rounded text-xs flex-wrap">
                    <span className="font-mono font-semibold text-foreground w-14 shrink-0">{progCodeId}</span>

                    {/* Sequential toggle */}
                    <button
                      onClick={() => {
                        updateProgCode({ progCodeId, runsInSequence: !currentRunsInSequence });
                        setToggledProgCodes((prev) => new Set([...prev, progCodeId]));
                      }}
                      className={cn(
                        "text-[10px] rounded px-1.5 py-0.5 transition-colors shrink-0",
                        currentRunsInSequence ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:text-foreground",
                      )}
                      title={currentRunsInSequence ? "Sequential — optimizer sets both min and max" : "Independent — optimizer only sets max"}
                    >
                      {currentRunsInSequence ? "Sequential" : "Independent"}
                    </button>

                    {/* Team rate display (price per day) */}
                    {teamAvgRate && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatDollars(teamAvgRate.price * scaleFactor)}/day
                      </span>
                    )}

                    {/* Rate override % — "what if" multiplier */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">+</span>
                      <input
                        type="number" min={0} max={2} step={0.01}
                        value={currentRateFrac.toFixed(2)}
                        onChange={(e) => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0);
                          setRateIncreaseFrac((prev) => ({ ...prev, [progCodeId]: v }));
                        }}
                        className="w-14 text-[10px] border border-border rounded px-1 py-0.5 bg-card text-center focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        title="Rate increase fraction (0.10 = 10% faster)"
                      />
                      <span className="text-[10px] text-muted-foreground">(fraction)</span>
                    </div>

                    {/* Per Employee popover */}
                    {perEmployeeRates.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Per-employee daily rates"
                          >
                            <Users className="w-3 h-3" />
                            Per Emp
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-3" align="start">
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                            {progCodeId} — $/day per employee
                            {currentRateFrac > 0 && (
                              <span className="text-primary ml-1">×{scaleFactor.toFixed(2)}</span>
                            )}
                          </p>
                          <div className="space-y-1">
                            {perEmployeeRates.map((emp) => (
                              <div key={emp.name} className="flex items-center justify-between text-[10px]">
                                <span className="text-foreground truncate mr-2">{emp.name}</span>
                                <span className="font-mono text-accent shrink-0">
                                  {formatDollars(emp.avgPricePerDay * scaleFactor)}/day
                                </span>
                              </div>
                            ))}
                          </div>
                          {currentRateFrac > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-1">
                              Rates scaled by +{(currentRateFrac * 100).toFixed(0)}%
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* Per-progCode padding */}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-muted-foreground">Buffer</span>
                      <input
                        type="number" min={0} max={30} value={currentPadding}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setLocalPadding((prev) => ({ ...prev, [progCodeId]: v }));
                        }}
                        className="w-10 text-xs border border-border rounded px-1 py-0.5 bg-card text-center focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground">d</span>
                    </div>
                  </div>

                  {/* ServCode rows */}
                  {visibleItems.map((item) => {
                    const currentLeft = ganttLeftPct(item.currentRange.min, timelineMin, totalGanttDays);
                    const currentWidth = ganttWidthPct(item.currentRange, totalGanttDays);
                    const newLeft = ganttLeftPct(item.proposedMin, timelineMin, totalGanttDays);
                    const newWidth = ganttWidthPct({ min: item.proposedMin, max: item.proposedMax }, totalGanttDays);
                    const changed = item.proposedMin !== item.currentRange.min || item.proposedMax !== item.currentRange.max;

                    return (
                      <div key={item.servCodeId} className="flex items-center gap-2 pl-1">
                        <span className="font-mono text-xs text-foreground w-12 shrink-0 truncate">{item.servCodeId}</span>

                        {/* Lock — always reserve space */}
                        <span title={item.isStarted ? "Start date locked (servCode already started)" : undefined}>
                          <Lock className={cn("w-3 h-3 shrink-0", item.isStarted ? "text-muted-foreground/50" : "invisible")} />
                        </span>

                        {/* Gantt bar */}
                        <div className="relative flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                          <div
                            className="absolute top-0.5 h-1.5 rounded bg-muted-foreground/35"
                            style={{ left: `${currentLeft}%`, width: `${Math.max(currentWidth, 0.5)}%` }}
                          />
                          <div
                            className={cn("absolute bottom-0.5 h-1.5 rounded", changed ? "bg-accent" : "bg-muted-foreground/35")}
                            style={{ left: `${newLeft}%`, width: `${Math.max(newWidth, 0.5)}%` }}
                          />
                          <div className="absolute top-0 bottom-0 w-px bg-primary/50" style={{ left: `${todayPct}%` }} />
                        </div>

                        {/* Date labels */}
                        <div className="shrink-0 flex flex-col items-end text-[10px] font-mono leading-tight w-24">
                          <span className="text-muted-foreground/50">
                            {formatDate(item.currentRange.min)}–{formatDate(item.currentRange.max)}
                          </span>
                          {changed && (
                            <span className="text-accent">
                              {formatDate(item.proposedMin)}–{formatDate(item.proposedMax)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-1.5 rounded bg-muted-foreground/35" />Current</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-1.5 rounded bg-accent" />Proposed</span>
            <span className="flex items-center gap-1"><span className="inline-block w-px h-3 bg-primary/50" />Today</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-muted-foreground/50" />Started (locked)</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50 shrink-0">
          <Button size="sm" variant="secondary" intensity="soft" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={changedItems.length === 0} onClick={handleApplyAndSave}>
            Apply &amp; Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
