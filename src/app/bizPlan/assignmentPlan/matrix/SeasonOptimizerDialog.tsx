"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CalendarRange, Info, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { AppState } from "@/store";
import { paceSelect, SeasonOptimizedRange } from "@/app/bizPlan/pace/paceSelectRefactor";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeasonOptimizerDialog() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const lookbackConfig = useSelector(paceSelect.lookbackConfig);
  const seasonResult = useSelector(paceSelect.seasonOptimizerResult);
  const progCodePaces = useSelector(paceSelect.progCodePaces);
  const servCodeDocMap = useSelector(progServSelect.servCodeDocMap);
  const progCodeDocMap = useSelector(progServSelect.progCodeMap);
  const unsavedProgCodeChanges = useSelector((state: AppState) => state.progServ.unsavedProgCodeChanges);
  const { updateServCode, updateProgCode, revertProgCode, saveServCodeChanges, saveProgCodeChanges } = useProgServ({});

  const today = dateStrings.today();

  // Local state for per-progCode padding overrides (not committed until Apply & Save)
  const [localPadding, setLocalPadding] = useState<Record<string, number>>({});
  // Track progCodes whose runsInSequence was toggled (for Cancel revert)
  const [toggledProgCodes, setToggledProgCodes] = useState<Set<string>>(new Set());

  // Lookback slider
  const allMins = progCodePaces.flatMap((p) => p.servCodePaces.map((sp) => sp.servCode.dateRange.min)).filter(Boolean).sort();
  const earliestMin = allMins[0] ?? today;
  const sliderTotalDays = Math.max(0, dateRanges.weekdaysBetween(earliestMin, today));
  const currentSliderValue = Math.min(
    Math.max(dateRanges.weekdaysBetween(earliestMin, lookbackConfig.lookbackStart), 0),
    sliderTotalDays,
  );

  // Gantt timeline bounds
  const timelineMin = (() => {
    const allRangeMins = seasonResult.flatMap((r) => [r.currentRange.min, r.proposedMin]).filter(Boolean).sort();
    const earliest = allRangeMins[0] ?? today;
    return earliest < today ? earliest : today;
  })();
  const timelineMax = (() => {
    const allRangeMaxes = seasonResult.flatMap((r) => [r.currentRange.max, r.proposedMax]).filter(Boolean).sort();
    return allRangeMaxes.at(-1) ?? today;
  })();
  const totalGanttDays = dateRanges.isValidDateRange({ min: timelineMin, max: timelineMax })
    ? Math.max(1, dateRanges.countWeekdays({ min: timelineMin, max: timelineMax }))
    : 1;
  const todayPct = ganttLeftPct(today, timelineMin, totalGanttDays);

  // Changed items accounting for local padding overrides
  const effectiveResult: SeasonOptimizedRange[] = seasonResult.map((item) => {
    const paddingOverride = localPadding[item.progCodeId];
    if (paddingOverride == null) return item;
    // Recompute proposedMax with local padding
    const proposedMax = item.hasWork && item.projectedEndDate
      ? dateStrings.addWeekdays(item.projectedEndDate, paddingOverride)
      : item.currentRange.max;
    return { ...item, proposedMax, paddingDays: paddingOverride };
  });

  const changedItems = effectiveResult.filter(
    (r) => r.hasWork && (r.proposedMin !== r.currentRange.min || r.proposedMax !== r.currentRange.max),
  );

  // Group results by progCode
  const byProgCode = new Map<string, SeasonOptimizedRange[]>();
  for (const item of effectiveResult) {
    const existing = byProgCode.get(item.progCodeId) ?? [];
    existing.push(item);
    byProgCode.set(item.progCodeId, existing);
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) {
      dispatch(paceActions.openSeasonOptimizer());
      setLocalPadding({});
      setToggledProgCodes(new Set());
    } else {
      // Cancel path — revert any runsInSequence toggles
      for (const progCodeId of toggledProgCodes) {
        revertProgCode(progCodeId);
      }
      dispatch(paceActions.closeSeasonOptimizer());
      setLocalPadding({});
      setToggledProgCodes(new Set());
    }
    setOpen(nextOpen);
  }

  function handleApplyAndSave() {
    const servChanges: UnsavedServCodeChanges[] = [];

    // Apply dateRange changes
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
      servChanges.push({
        original,
        updated: { ...original, dateRange: newRange, paddingDays: effectivePadding },
      });
      updateServCode({ servCodeId: item.servCodeId, dateRange: newRange, paddingDays: effectivePadding });
    }

    // Apply pure paddingDays-only changes (servCodes with no date change)
    for (const [progCodeId, padding] of Object.entries(localPadding)) {
      const items = byProgCode.get(progCodeId) ?? [];
      for (const item of items) {
        if (changedItems.find((c) => c.servCodeId === item.servCodeId)) continue; // already handled
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

    // runsInSequence changes are already staged via immediate updateProgCode dispatches
    // (dispatched on toggle click) — pass them directly to save
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
          {/* Controls */}
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
              <span title="Minimum fraction of scheduled services that must be completed for a day to count as a valid production day." className="text-muted-foreground cursor-help">
                <Info className="w-3 h-3" />
              </span>
              <input
                id="season-threshold" type="number" min={0} max={100} step={5}
                value={Math.round(lookbackConfig.completionThreshold * 100)}
                onChange={(e) => dispatch(paceActions.setLookbackCompletionThreshold(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100))}
                className="w-14 text-sm border border-border rounded px-2 py-1 bg-card text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Gantt timeline header */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
            <span>{formatDate(timelineMin)}</span>
            <span className="text-primary">{changedItems.length} change{changedItems.length !== 1 ? "s" : ""}</span>
            <span>{formatDate(timelineMax)}</span>
          </div>

          {/* ProgCode groups — only show those with at least one servCode that has work */}
          {[...byProgCode.entries()]
            .filter(([, items]) => items.some((r) => r.hasWork))
            .map(([progCodeId, items]) => {
            const progCodePace = progCodePaces.find((p) => p.progCode.progCodeId === progCodeId);
            if (!progCodePace) return null;
            const currentRunsInSequence = progCodePace.progCode.runsInSequence;
            const currentPadding = localPadding[progCodeId] ?? items[0]?.paddingDays ?? 0;
            // Only show servCodes that have work
            const visibleItems = items.filter((r) => r.hasWork);

            return (
              <div key={progCodeId} className="space-y-1">
                {/* ProgCode header */}
                <div className="flex items-center gap-3 px-1 py-0.5 bg-accent/10 rounded text-xs">
                  <span className="font-mono font-semibold text-foreground w-16 shrink-0">{progCodeId}</span>
                  {/* runsInSequence toggle */}
                  <button
                    onClick={() => {
                      updateProgCode({ progCodeId, runsInSequence: !currentRunsInSequence });
                      setToggledProgCodes((prev) => new Set([...prev, progCodeId]));
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 transition-colors",
                      currentRunsInSequence ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                    title={currentRunsInSequence ? "Runs in sequence — optimizer sets both min and max" : "Independent — optimizer only sets max"}
                  >
                    {currentRunsInSequence ? "Sequential" : "Independent"}
                  </button>
                  {/* Per-progCode padding */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-muted-foreground">Buffer</span>
                    <input
                      type="number" min={0} max={30} value={currentPadding}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setLocalPadding((prev) => ({ ...prev, [progCodeId]: v }));
                      }}
                      className="w-12 text-xs border border-border rounded px-1 py-0.5 bg-card text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[10px] text-muted-foreground">d</span>
                  </div>
                </div>

                {/* ServCode rows — only those with work */}
                {visibleItems.map((item) => {
                  const currentLeft = ganttLeftPct(item.currentRange.min, timelineMin, totalGanttDays);
                  const currentWidth = ganttWidthPct(item.currentRange, totalGanttDays);
                  const newLeft = ganttLeftPct(item.proposedMin, timelineMin, totalGanttDays);
                  const newWidth = ganttWidthPct({ min: item.proposedMin, max: item.proposedMax }, totalGanttDays);
                  const changed = item.hasWork && (item.proposedMin !== item.currentRange.min || item.proposedMax !== item.currentRange.max);

                  return (
                    <div key={item.servCodeId} className="flex items-center gap-2 pl-1">
                      <span className="font-mono text-xs text-foreground w-12 shrink-0 truncate">{item.servCodeId}</span>

                      {/* Auto-lock indicator — always reserve the space to keep Gantt bars aligned */}
                      <span title={item.isStarted ? "Start date locked (servCode already started)" : undefined}>
                        <Lock className={cn("w-3 h-3 shrink-0", item.isStarted ? "text-muted-foreground/50" : "invisible")} />
                      </span>

                      {/* Bar track */}
                      <div className="relative flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                        <div className="absolute top-0.5 h-1.5 rounded bg-muted-foreground/35"
                          style={{ left: `${currentLeft}%`, width: `${Math.max(currentWidth, 0.5)}%` }} />
                        {item.hasWork && (
                          <div className={cn("absolute bottom-0.5 h-1.5 rounded", changed ? "bg-accent" : "bg-muted-foreground/35")}
                            style={{ left: `${newLeft}%`, width: `${Math.max(newWidth, 0.5)}%` }} />
                        )}
                        <div className="absolute top-0 bottom-0 w-px bg-primary/50" style={{ left: `${todayPct}%` }} />
                      </div>

                      {/* Date labels */}
                      <div className="shrink-0 flex flex-col items-end text-[10px] font-mono leading-tight w-24">
                        <span className="text-muted-foreground/50">{formatDate(item.currentRange.min)}–{formatDate(item.currentRange.max)}</span>
                        {item.hasWork && changed && <span className="text-accent">{formatDate(item.proposedMin)}–{formatDate(item.proposedMax)}</span>}
                        {!item.hasWork && <span className="text-muted-foreground/40">no work</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-1.5 rounded bg-muted-foreground/35" />Current
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-1.5 rounded bg-accent" />Proposed
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-px h-3 bg-primary/50" />Today
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-muted-foreground/50" />Started (start locked)
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50 shrink-0">
          <Button size="sm" variant="secondary" intensity="soft" onClick={() => handleOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={changedItems.length === 0} onClick={handleApplyAndSave}>
            Apply &amp; Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
