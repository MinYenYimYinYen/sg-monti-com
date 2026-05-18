"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { SeasonOptimizedRange } from "@/app/bizPlan/pace/PaceTypes";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { cn } from "@/style/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServCodeEventKind =
  | { kind: "opens"; employeeIds: string[] }
  | { kind: "closes" }
  | { kind: "employeeResumes"; employeeId: string }
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

// Builds per-servCode event groups from effectiveResult, cascadeMap, and servCodePaceMap.
function buildServCodeEventGroups(
  effectiveResult: SeasonOptimizedRange[],
  cascadeMap: ReturnType<typeof cascadeSelect.employeeCascadeMap>,
  servCodePaceMap: ReturnType<typeof servCodePaceSelect.servCodePaceMap>,
): ServCodeEventGroup[] {
  // Quick lookup: servCodeId → proposedMin
  const openDateByServCode = new Map<string, string>();
  for (const item of effectiveResult) {
    openDateByServCode.set(item.servCodeId, item.proposedMin);
  }

  // Build a lookup: employeeId → Set of dates on which they close another servCode.
  // Used to distinguish "employee starts fresh on open date" from "employee is still
  // finishing another servCode on the open date and joins the next weekday".
  const employeeCloseDates = new Map<string, Set<string>>();
  for (const item of effectiveResult) {
    if (!item.hasWork) continue;
    const pace = servCodePaceMap.get(item.servCodeId);
    for (const emp of pace?.servCode.assignedTo ?? []) {
      if (!employeeCloseDates.has(emp.employeeId)) employeeCloseDates.set(emp.employeeId, new Set());
      employeeCloseDates.get(emp.employeeId)!.add(item.proposedMax);
    }
  }

  const groups: ServCodeEventGroup[] = [];

  for (const item of effectiveResult) {
    if (!item.hasWork) continue;

    const pace = servCodePaceMap.get(item.servCodeId);
    const totalPoolPrice = pace?.servCode
      ? (pace.teamAvgCapacity.price > 0
        ? pace.teamAvgCapacity.price * Math.max(1, dateRanges.countWeekdays({ min: item.proposedMin, max: item.proposedMax }))
        : 0)
      : 0;
    // Use activeAsapCSP price as the total pool (unfinished work remaining)
    // teamAvgCapacity is daily rate; we want the pool = activeAsapCSP from rawPaceSelect
    // Since we don't have rawPaceSelect here, approximate: pool ≈ dailyRate × total days
    const dailyRate = pace?.teamAvgCapacity.price ?? 0;
    const totalDays = Math.max(1, dateRanges.countWeekdays({ min: item.proposedMin, max: item.proposedMax }));
    const poolPrice = dailyRate * totalDays;

    // Collect all boundary dates for this servCode
    const boundarySet = new Set<string>([item.proposedMin, item.proposedMax]);

    // Employee cascade events for this servCode
    const assignedEmployeeIds = pace?.servCode.assignedTo.map((e) => e.employeeId) ?? [];

    for (const employeeId of assignedEmployeeIds) {
      const cascadeResult = cascadeMap.get(employeeId);
      const entry = cascadeResult?.byServCode.get(item.servCodeId);
      if (!entry?.availableFrom) continue;

      // ── Case 1: Employee was never available from the open date ──
      // availableFrom > proposedMin means the employee was finishing a higher-priority
      // servCode before this one opened (e.g. IC1 closes on LR2's open date).
      const anotherServCodeClosesOnOpenDate = employeeCloseDates.get(employeeId)?.has(item.proposedMin) ?? false;
      const effectiveResumeDate = (entry.availableFrom === item.proposedMin && anotherServCodeClosesOnOpenDate)
        ? dateStrings.nextWeekdayAfter(entry.availableFrom)
        : entry.availableFrom;
      const rawAvailableFrom = entry.availableFrom;

      if (effectiveResumeDate > item.proposedMin) {
        boundarySet.add(effectiveResumeDate);
        for (const [otherServCodeId] of cascadeResult!.byServCode) {
          if (otherServCodeId === item.servCodeId) continue;
          const otherOpenDate = openDateByServCode.get(otherServCodeId);
          if (!otherOpenDate) continue;
          if (otherOpenDate > item.proposedMin && otherOpenDate <= rawAvailableFrom) {
            boundarySet.add(otherOpenDate);
          }
        }
      }

      // ── Case 2: Mid-servCode preemption ──
      // Employee started this servCode (availableFrom <= proposedMin) but a higher-priority
      // servCode opens mid-way (e.g. IC2 opens during LR3). The cascade's availableFrom
      // only records the first worked date, not the resume date after interruption.
      // Detect by scanning for other servCodes whose openDate falls strictly between
      // entry.availableFrom and item.proposedMax.
      for (const [otherServCodeId] of cascadeResult!.byServCode) {
        if (otherServCodeId === item.servCodeId) continue;
        const otherOpenDate = openDateByServCode.get(otherServCodeId);
        if (!otherOpenDate) continue;
        // The interrupting servCode opens after this servCode started and before it ends
        if (otherOpenDate > entry.availableFrom && otherOpenDate < item.proposedMax) {
          // Add the leave date as a boundary
          boundarySet.add(otherOpenDate);
          // Resume date = next weekday after the interrupting servCode closes
          const otherItem = effectiveResult.find((r) => r.servCodeId === otherServCodeId);
          if (otherItem) {
            const resumeDate = dateStrings.nextWeekdayAfter(otherItem.proposedMax);
            if (resumeDate < item.proposedMax) {
              boundarySet.add(resumeDate);
            }
          }
        }
      }
    }

    const boundaries = [...boundarySet].sort();

    // Build date rows
    const dateRows: ServCodeDateRow[] = boundaries.map((date) => {
      const weekdaysElapsed = Math.max(0, dateRanges.countWeekdays({ min: item.proposedMin, max: date }) - 1);
      const remainingPrice = Math.max(0, poolPrice - dailyRate * weekdaysElapsed);
      const events: ServCodeEventKind[] = [];

      // Opens event: list employees available from day 1.
      // Exclude employees who are still finishing another servCode on the open date
      // (detected by: availableFrom === proposedMin AND another servCode closes that day).
      if (date === item.proposedMin) {
        const immediatelyAvailable = assignedEmployeeIds.filter((employeeId) => {
          const entry = cascadeMap.get(employeeId)?.byServCode.get(item.servCodeId);
          const availFrom = entry?.availableFrom;
          if (!availFrom || availFrom < item.proposedMin) return true;
          // availableFrom === proposedMin: only exclude if another servCode closes that day
          if (availFrom === item.proposedMin) {
            return !(employeeCloseDates.get(employeeId)?.has(item.proposedMin) ?? false);
          }
          return false;
        });
        events.push({ kind: "opens", employeeIds: immediatelyAvailable });
      }

      // Closes event
      if (date === item.proposedMax) {
        events.push({ kind: "closes" });
      }

      // Employee resume / leave events
      for (const employeeId of assignedEmployeeIds) {
        const cascadeResult = cascadeMap.get(employeeId);
        const entry = cascadeResult?.byServCode.get(item.servCodeId);
        if (!entry?.availableFrom) continue;

        // ── Case 1: Employee was never available from the open date ──
        const anotherClosesOnOpen = employeeCloseDates.get(employeeId)?.has(item.proposedMin) ?? false;
        const effectiveResume = (entry.availableFrom === item.proposedMin && anotherClosesOnOpen)
          ? dateStrings.nextWeekdayAfter(entry.availableFrom)
          : entry.availableFrom;
        const rawAvailFrom = entry.availableFrom;

        if (effectiveResume === date && effectiveResume > item.proposedMin) {
          events.push({ kind: "employeeResumes", employeeId });
        }

        if (effectiveResume > item.proposedMin) {
          for (const [otherServCodeId] of cascadeResult!.byServCode) {
            if (otherServCodeId === item.servCodeId) continue;
            const otherOpenDate = openDateByServCode.get(otherServCodeId);
            if (otherOpenDate === date && otherOpenDate > item.proposedMin && otherOpenDate <= rawAvailFrom) {
              events.push({ kind: "employeeLeaves", employeeId, toServCodeId: otherServCodeId });
            }
          }
        }

        // ── Case 2: Mid-servCode preemption ──
        // Employee started this servCode but a higher-priority servCode opens mid-way.
        for (const [otherServCodeId] of cascadeResult!.byServCode) {
          if (otherServCodeId === item.servCodeId) continue;
          const otherOpenDate = openDateByServCode.get(otherServCodeId);
          if (!otherOpenDate) continue;
          if (otherOpenDate > entry.availableFrom && otherOpenDate < item.proposedMax) {
            // Leave event: employee departs on the interrupting servCode's open date
            if (otherOpenDate === date) {
              events.push({ kind: "employeeLeaves", employeeId, toServCodeId: otherServCodeId });
            }
            // Resume event: employee returns the next weekday after the interrupting servCode closes
            const otherItem = effectiveResult.find((r) => r.servCodeId === otherServCodeId);
            if (otherItem) {
              const resumeDate = dateStrings.nextWeekdayAfter(otherItem.proposedMax);
              if (resumeDate === date && resumeDate < item.proposedMax) {
                events.push({ kind: "employeeResumes", employeeId });
              }
            }
          }
        }
      }

      return { date, remainingPrice, events };
    });

    // Only include rows that have events
    const rowsWithEvents = dateRows.filter((r) => r.events.length > 0);

    groups.push({
      servCodeId: item.servCodeId,
      totalPoolPrice: poolPrice,
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
};

export function OptimizerInsightsPopover({
  changedItems,
  effectiveResult,
  cascadeMap,
  servCodePaceMap,
}: OptimizerInsightsPopoverProps) {
  const groups = buildServCodeEventGroups(effectiveResult, cascadeMap, servCodePaceMap);

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
