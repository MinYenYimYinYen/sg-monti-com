"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { SeasonOptimizedRange } from "@/app/bizPlan/pace/PaceTypes";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { runCascadeSimulation } from "@/app/bizPlan/pace/_lib/cascadeSimulation";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { cn } from "@/style/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServCodeEventKind =
  | { kind: "opens"; employeeIds: string[] }
  | { kind: "closes" }
  | { kind: "employeeResumes"; employeeId: string; fromServCodeId: string | null }
  | { kind: "employeeLeaves"; employeeId: string; toServCodeId: string };

type ServCodeDateRow = {
  date: string;
  /** Remaining pool price at this date: totalPool - (weekdays elapsed × dailyRate) */
  remainingPrice: number;
  events: ServCodeEventKind[];
};

type ServCodeEventGroup = {
  servCodeId: string;
  totalPoolPrice: number;
  proposedMin: string;
  proposedMax: string;
  dateRows: ServCodeDateRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function signedDays(n: number): string {
  return n > 0 ? `+${n}d` : `${n}d`;
}

// Builds per-servCode event groups by running a fresh cascade simulation using
// the optimizer's proposed dates (proposedMin/proposedMax) as open/close dates.
// This ensures sequential progCodes show the correct start dates rather than
// the stale dateRange.min values stored in RealGreen.
function buildServCodeEventGroups(
  effectiveResult: SeasonOptimizedRange[],
  cascadeMap: ReturnType<typeof cascadeSelect.employeeCascadeMap>,
  servCodePaceMap: ReturnType<typeof servCodePaceSelect.servCodePaceMap>,
  today: string,
): ServCodeEventGroup[] {
  const groups: ServCodeEventGroup[] = [];

  for (const item of effectiveResult) {
    if (!item.hasWork) continue;

    const pace = servCodePaceMap.get(item.servCodeId);
    const totalPoolPrice = pace?.activeAsapCSP.price ?? 0;
    const assignedEmployeeIds = pace?.servCode.assignedTo.map((e) => e.employeeId) ?? [];

    // Run a fresh per-employee simulation using proposed dates for this servCode.
    // Each employee's priority list is their full servCodeIds list; we use proposedMin/Max
    // from effectiveResult as the open/close dates so sequential chaining is respected.
    type EmployeeSimResult = {
      availableFrom: string | undefined;
      timelineEvents: ReturnType<typeof runCascadeSimulation>["timelineEvents"] extends Map<string, infer V> ? V : never;
      contributedPriceByBoundary: Map<string, number>;
    };
    const employeeSimResults = new Map<string, EmployeeSimResult>();

    for (const employeeId of assignedEmployeeIds) {
      const cascadeResult = cascadeMap.get(employeeId);
      if (!cascadeResult) continue;

      // Build sim entries for this employee using proposed dates from effectiveResult.
      // Pool = dailyRate × proposed duration so the simulation has enough work to run
      // through all intervals and detect preemptions. contributedCSP is wrong here
      // because it reflects the Redux cascade's stale dates (often zero for sequential
      // servCodes whose dateRange.min hasn't been updated yet).
      const simEntries = cascadeResult.employee.servCodeIds
        .map((servCodeId) => {
          const entry = cascadeResult.byServCode.get(servCodeId);
          if (!entry) return null;
          const proposed = effectiveResult.find((r) => r.servCodeId === servCodeId);
          const openDate = proposed ? proposed.proposedMin : (entry.availableFrom ?? today);
          const closeDate = proposed ? proposed.proposedMax : today;
          const proposedWeekdays = Math.max(1, dateRanges.countWeekdays({ min: openDate, max: closeDate }));
          // Use dailyRate × duration as pool; fall back to 1/day if dailyRate is zero.
          const effectiveDailyRate = entry.dailyRate.price > 0 ? entry.dailyRate : { count: 1, size: 1, price: 1, rev: 1 };
          const pool = {
            count: effectiveDailyRate.count * proposedWeekdays,
            size: effectiveDailyRate.size * proposedWeekdays,
            price: effectiveDailyRate.price * proposedWeekdays,
            rev: effectiveDailyRate.rev * proposedWeekdays,
          };
          return {
            servCodeId,
            openDate,
            closeDate,
            pool,
            dailyRate: effectiveDailyRate,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      const simResult = runCascadeSimulation(simEntries, today);
      const avFrom = simResult.availableFrom.get(item.servCodeId);
      const events = simResult.timelineEvents.get(item.servCodeId) ?? [];
      const byBoundary = simResult.contributedPriceByBoundary.get(item.servCodeId) ?? new Map<string, number>();
      employeeSimResults.set(employeeId, { availableFrom: avFrom, timelineEvents: events, contributedPriceByBoundary: byBoundary });
    }

    // Collect boundary dates from the fresh simulation results.
    const boundarySet = new Set<string>([item.proposedMin, item.proposedMax]);
    for (const [, simRes] of employeeSimResults) {
      if (simRes.availableFrom && simRes.availableFrom > item.proposedMin) {
        boundarySet.add(simRes.availableFrom);
      }
      for (const event of simRes.timelineEvents) {
        boundarySet.add(event.date);
      }
    }

    const boundaries = [...boundarySet].sort();

    // Build cumulative team drain at each boundary by summing across all employee simulations.
    // This replaces the linear formula (totalPoolPrice - dailyRate × elapsed) which assumed
    // the full team works every day — incorrect when employees leave for higher-priority servCodes.
    const cumulativeTeamDrainAtBoundary = new Map<string, number>();
    for (const boundary of boundaries) {
      let totalDrain = 0;
      for (const [, simRes] of employeeSimResults) {
        const byBoundary = simRes.contributedPriceByBoundary;
        // Find the latest boundary ≤ this date in the employee's map.
        let empDrain = 0;
        for (const [bDate, drain] of byBoundary) {
          if (bDate <= boundary) empDrain = drain;
        }
        totalDrain += empDrain;
      }
      cumulativeTeamDrainAtBoundary.set(boundary, totalDrain);
    }

    const dateRows: ServCodeDateRow[] = boundaries.map((date) => {
      const drained = cumulativeTeamDrainAtBoundary.get(date) ?? 0;
      const remainingPrice = Math.max(0, totalPoolPrice - drained);
      const events: ServCodeEventKind[] = [];

      // Opens event: employees available from day 1.
      if (date === item.proposedMin) {
        const immediatelyAvailable = assignedEmployeeIds.filter((employeeId) => {
          const simRes = employeeSimResults.get(employeeId);
          return !simRes?.availableFrom || simRes.availableFrom <= item.proposedMin;
        });
        events.push({ kind: "opens", employeeIds: immediatelyAvailable });
      }

      // Closes event.
      if (date === item.proposedMax) {
        events.push({ kind: "closes" });
      }

      // Per-employee events.
      for (const employeeId of assignedEmployeeIds) {
        const simRes = employeeSimResults.get(employeeId);
        if (!simRes?.availableFrom) continue;

        // Initial late-start (no timeline events = simple delay from start).
        if (simRes.availableFrom === date && simRes.availableFrom > item.proposedMin) {
          if (simRes.timelineEvents.length === 0) {
            events.push({ kind: "employeeResumes", employeeId, fromServCodeId: null });
          }
        }

        // Leave and resume events from the fresh simulation.
        for (const event of simRes.timelineEvents) {
          if (event.date !== date) continue;
          if (event.kind === "leave") {
            events.push({ kind: "employeeLeaves", employeeId, toServCodeId: event.toServCodeId });
          } else {
            events.push({ kind: "employeeResumes", employeeId, fromServCodeId: event.fromServCodeId });
          }
        }
      }

      return { date, remainingPrice, events };
    });

    const rowsWithEvents = dateRows.filter((r) => r.events.length > 0);

    groups.push({
      servCodeId: item.servCodeId,
      totalPoolPrice,
      proposedMin: item.proposedMin,
      proposedMax: item.proposedMax,
      dateRows: rowsWithEvents,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChangesTab({ changedItems }: { changedItems: SeasonOptimizedRange[] }) {
  if (changedItems.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground text-center py-4">No changes</p>
    );
  }

  return (
    <div className="space-y-1">
      {changedItems.map((item) => {
        const minChanged = item.proposedMin !== item.currentRange.min;
        const maxChanged = item.proposedMax !== item.currentRange.max;
        const minDelta = minChanged
          ? dateRanges.weekdaysBetween(item.currentRange.min, item.proposedMin)
          : null;
        const maxDelta = maxChanged
          ? dateRanges.weekdaysBetween(item.currentRange.max, item.proposedMax)
          : null;

        return (
          <div key={item.servCodeId} className="flex items-start gap-2 text-[11px]">
            <span className="font-mono text-foreground w-10 shrink-0">{item.servCodeId}</span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-muted-foreground font-mono">
                {formatDate(item.currentRange.min)}–{formatDate(item.currentRange.max)}
              </span>
              <span className="text-accent font-mono">
                {formatDate(item.proposedMin)}–{formatDate(item.proposedMax)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0 text-[10px] font-mono">
              {minDelta !== null && (
                <span className={cn(minDelta > 0 ? "text-destructive" : "text-accent")}>
                  start {signedDays(minDelta)}
                </span>
              )}
              {maxDelta !== null && (
                <span className={cn(maxDelta > 0 ? "text-destructive" : "text-accent")}>
                  end {signedDays(maxDelta)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventDetail({ event }: { event: ServCodeEventKind }) {
  switch (event.kind) {
    case "opens":
      return (
        <div className="text-[10px]">
          <span className="font-mono text-accent">{event.employeeIds.join(" ")}</span>
          <span className="text-muted-foreground"> start</span>
        </div>
      );
    case "closes":
      return (
        <div className="text-[10px] text-muted-foreground">closes</div>
      );
    case "employeeResumes":
      return (
        <div className="text-[10px]">
          <span className="font-mono text-primary">{event.employeeId}</span>
          <span className="text-muted-foreground"> available</span>
          {event.fromServCodeId !== null
            ? <span className="text-muted-foreground"> (from <span className="font-mono text-foreground">{event.fromServCodeId}</span>)</span>
            : <span className="text-muted-foreground"> (from downtime)</span>
          }
        </div>
      );
    case "employeeLeaves":
      return (
        <div className="text-[10px]">
          <span className="font-mono text-secondary">{event.employeeId}</span>
          <span className="text-muted-foreground"> moves to </span>
          <span className="font-mono text-foreground">{event.toServCodeId}</span>
        </div>
      );
  }
}

function EventsTab({
  groups,
}: {
  groups: ServCodeEventGroup[];
}) {
  const [expandedServCodes, setExpandedServCodes] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  function toggleServCode(servCodeId: string) {
    setExpandedServCodes((prev) => {
      const next = new Set(prev);
      if (next.has(servCodeId)) next.delete(servCodeId);
      else next.add(servCodeId);
      return next;
    });
  }

  function toggleDate(key: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground text-center py-4">No events</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {groups.map((group) => {
        const isServCodeExpanded = expandedServCodes.has(group.servCodeId);

        return (
          <div key={group.servCodeId} className="rounded overflow-hidden">
            {/* ServCode header row */}
            <button
              onClick={() => toggleServCode(group.servCodeId)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] hover:bg-accent/10 transition-colors text-left"
            >
              {isServCodeExpanded
                ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              }
              <span className="font-mono text-foreground w-10 shrink-0">{group.servCodeId}</span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {formatDate(group.proposedMin)}–{formatDate(group.proposedMax)}
              </span>
              <span className="ml-auto font-mono text-[10px] text-accent shrink-0">
                {formatDollars(group.totalPoolPrice)}
              </span>
            </button>

            {/* Date rows */}
            {isServCodeExpanded && (
              <div className="pl-4 space-y-0.5 pb-1">
                {group.dateRows.map((row) => {
                  const dateKey = `${group.servCodeId}:${row.date}`;
                  const isDateExpanded = expandedDates.has(dateKey);

                  return (
                    <div key={row.date} className="rounded overflow-hidden">
                      <button
                        onClick={() => toggleDate(dateKey)}
                        className="w-full flex items-center gap-1.5 px-2 py-0.5 text-[10px] hover:bg-accent/10 transition-colors text-left"
                      >
                        {isDateExpanded
                          ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        }
                        <span className="font-mono text-foreground/80 w-9 shrink-0">{formatDate(row.date)}</span>
                        <span className="font-mono text-muted-foreground ml-auto shrink-0">
                          {formatDollars(row.remainingPrice)} remaining
                        </span>
                      </button>

                      {isDateExpanded && (
                        <div className="pl-8 pr-2 pb-1 space-y-0.5">
                          {row.events.map((event, idx) => (
                            <EventDetail key={idx} event={event} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type OptimizerInsightsPopoverProps = {
  changedItems: SeasonOptimizedRange[];
  effectiveResult: SeasonOptimizedRange[];
  cascadeMap: ReturnType<typeof cascadeSelect.employeeCascadeMap>;
  servCodePaceMap: ReturnType<typeof servCodePaceSelect.servCodePaceMap>;
  today: string;
};

export function OptimizerInsightsPopover({
  changedItems,
  effectiveResult,
  cascadeMap,
  servCodePaceMap,
  today,
}: OptimizerInsightsPopoverProps) {
  const groups = buildServCodeEventGroups(effectiveResult, cascadeMap, servCodePaceMap, today);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-primary text-[10px] hover:underline transition-colors">
          {changedItems.length} change{changedItems.length !== 1 ? "s" : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 flex flex-col max-h-96 overflow-hidden" align="center">
        <Tabs defaultValue="changes" className="flex flex-col flex-1 min-h-0">
          <TabsList variant="accent" className="mb-2 self-start shrink-0">
            <TabsTrigger value="changes" variant="accent" className="text-xs px-3 py-1">
              Changes ({changedItems.length})
            </TabsTrigger>
            <TabsTrigger value="events" variant="accent" className="text-xs px-3 py-1">
              Events ({groups.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="overflow-y-auto flex-1 min-h-0">
            <ChangesTab changedItems={changedItems} />
          </TabsContent>

          <TabsContent value="events" className="overflow-y-auto flex-1 min-h-0">
            <EventsTab groups={groups} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
