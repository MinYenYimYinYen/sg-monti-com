"use client";

import { useSelector } from "react-redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import type { ServCodeTimelineEvent } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The crew-change event that opened this segment.
 * Null for the first segment (no prior change).
 * context: the entry label the employee came from ("joins") or switched to ("leaves").
 */
type SegmentTrigger =
  | { kind: "joins"; employeeId: string; context: string | null }
  | { kind: "leaves"; employeeId: string; context: string | null };

/**
 * One stable crew period between two consecutive crew-change events.
 * Represents a segment of the Gantt bar.
 */
export type GanttSegment = {
  /** Start date of this crew period (inclusive). */
  startDate: string;
  /** End date of this crew period (inclusive). Null for the last segment (open-ended). */
  endDate: string | null;
  /** Team drain rate during this period ($/day). */
  teamDailyRate: number;
  /** Pool remaining at the start of this segment. */
  poolAtStart: number;
  /** Pool remaining at the end of this segment (from the closing event, or null if open). */
  poolAtEnd: number | null;
  /** Snapshot of active employees at the start of this segment. */
  employees: { employeeId: string; employeeDailyRate: number }[];
  /** What crew change triggered this segment. Null for the first segment. */
  trigger: SegmentTrigger | null;
};

// ---------------------------------------------------------------------------
// Helper: build segments from servCodeTimeline events
// ---------------------------------------------------------------------------

/**
 * Converts a flat list of ServCodeTimelineEvents into stable crew segments.
 *
 * Each segment spans from one crew-change event to the next.
 * "starts" and "returns" events open a new segment (trigger = "joins").
 * "leaves" events close the current segment (trigger for next = "leaves").
 * "finishes" events close the final segment.
 */
export function buildSegmentsFromTimeline(
  events: ServCodeTimelineEvent[],
  barStart: string,
  barEnd: string,
): GanttSegment[] {
  if (events.length === 0) return [];

  const segments: GanttSegment[] = [];

  // Track active employees as we walk through events
  const activeEmployees = new Map<string, number>(); // employeeId → dailyRate
  let segmentStart = barStart;
  let poolAtSegmentStart = events[0]?.poolRemaining ?? 0;
  let pendingTrigger: SegmentTrigger | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.kind === "starts" || event.kind === "returns") {
      // If there were already active employees, close the previous segment
      if (activeEmployees.size > 0 && event.date > segmentStart) {
        segments.push({
          startDate: segmentStart,
          endDate: event.date,
          teamDailyRate: Array.from(activeEmployees.values()).reduce((s, r) => s + r, 0),
          poolAtStart: poolAtSegmentStart,
          poolAtEnd: event.poolRemaining,
          employees: Array.from(activeEmployees.entries()).map(([employeeId, employeeDailyRate]) => ({
            employeeId,
            employeeDailyRate,
          })),
          trigger: pendingTrigger,
        });
        poolAtSegmentStart = event.poolRemaining;
        segmentStart = event.date;
        pendingTrigger = {
          kind: "joins",
          employeeId: event.employeeId,
          context: event.kind === "returns" ? (event.fromServCode ?? null) : null,
        };
      } else if (activeEmployees.size === 0) {
        segmentStart = event.date;
        poolAtSegmentStart = event.poolRemaining;
        // First segment — no trigger
        pendingTrigger = null;
      }
      activeEmployees.set(event.employeeId, event.employeeDailyRate);
    } else if (event.kind === "leaves") {
      // Close segment up to this date
      if (activeEmployees.size > 0) {
        segments.push({
          startDate: segmentStart,
          endDate: event.date,
          teamDailyRate: Array.from(activeEmployees.values()).reduce((s, r) => s + r, 0),
          poolAtStart: poolAtSegmentStart,
          poolAtEnd: event.poolRemaining,
          employees: Array.from(activeEmployees.entries()).map(([employeeId, employeeDailyRate]) => ({
            employeeId,
            employeeDailyRate,
          })),
          trigger: pendingTrigger,
        });
        poolAtSegmentStart = event.poolRemaining;
        segmentStart = event.date;
        pendingTrigger = { kind: "leaves", employeeId: event.employeeId, context: event.toServCode ?? null };
      }
      activeEmployees.delete(event.employeeId);
    } else if (event.kind === "finishes") {
      // Close final segment
      if (activeEmployees.size > 0) {
        segments.push({
          startDate: segmentStart,
          endDate: event.date,
          teamDailyRate: Array.from(activeEmployees.values()).reduce((s, r) => s + r, 0),
          poolAtStart: poolAtSegmentStart,
          poolAtEnd: 0,
          employees: Array.from(activeEmployees.entries()).map(([employeeId, employeeDailyRate]) => ({
            employeeId,
            employeeDailyRate,
          })),
          trigger: pendingTrigger,
        });
      }
      activeEmployees.clear();
    }
  }

  // If there are still active employees at the end, close with barEnd
  if (activeEmployees.size > 0) {
    segments.push({
      startDate: segmentStart,
      endDate: barEnd,
      teamDailyRate: Array.from(activeEmployees.values()).reduce((s, r) => s + r, 0),
      poolAtStart: poolAtSegmentStart,
      poolAtEnd: null,
      employees: Array.from(activeEmployees.entries()).map(([employeeId, employeeDailyRate]) => ({
        employeeId,
        employeeDailyRate,
      })),
      trigger: pendingTrigger,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// GanttBarDetail — popover content for a single segment
// ---------------------------------------------------------------------------

type GanttBarDetailProps = {
  servCodeId: string;
  /** The group label this servCode belongs to (null = single). */
  groupLabel: string | null;
  segment: GanttSegment;
};

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function GanttBarDetail({ servCodeId, groupLabel, segment }: GanttBarDetailProps) {
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const dailyRateByEmployeeByServCode = useSelector(paceCrawlerSelect.dailyRateByEmployeeByServCode);
  const totalAvgDailyPriceByEmployee = useSelector(paceCrawlerSelect.totalAvgDailyPriceByEmployee);

  const isGroup = groupLabel !== null;

  // Resolve trigger employee name
  const triggerEmployeeName = segment.trigger
    ? (employeeMap.get(segment.trigger.employeeId)?.name ?? segment.trigger.employeeId)
    : null;

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-foreground font-mono">{servCodeId}</span>
        {isGroup && (
          <span className="text-[9px] text-primary bg-primary/10 rounded px-1">
            group: {groupLabel}
          </span>
        )}
      </div>

      {/* Trigger — what crew change opened this segment */}
      {segment.trigger !== null && triggerEmployeeName !== null && (
        <div className={`text-[10px] font-medium ${segment.trigger.kind === "joins" ? "text-accent" : "text-muted-foreground"}`}>
          {segment.trigger.kind === "joins" ? "+" : "−"} {triggerEmployeeName}{" "}
          <span className="font-normal opacity-70">
            {segment.trigger.kind === "joins"
              ? segment.trigger.context
                ? `joined (from ${segment.trigger.context})`
                : "joined"
              : segment.trigger.context
                ? `left (to ${segment.trigger.context})`
                : "left"}
          </span>
        </div>
      )}

      {/* Date range */}
      <div className="text-[10px] text-muted-foreground">
        {formatDate(segment.startDate)}
        {segment.endDate ? ` → ${formatDate(segment.endDate)}` : " → …"}
      </div>

      {/* Pool */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Pool</span>
        <span className="font-mono text-foreground">
          {formatDollars(segment.poolAtStart)}
          {segment.poolAtEnd !== null && (
            <span className="text-muted-foreground"> → {segment.poolAtEnd === 0 ? "done" : formatDollars(segment.poolAtEnd)}</span>
          )}
        </span>
      </div>

      {/* Team rate */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Team $/day</span>
        <span className="font-mono font-semibold text-accent">{formatDollars(segment.teamDailyRate)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Per-employee breakdown */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Crew</span>
        {segment.employees.map(({ employeeId, employeeDailyRate }) => {
          const employee = employeeMap.get(employeeId);
          const name = employee?.name ?? employeeId;

          // For group entries: memberRate = individual servCode rate, groupRate = totalAvgDailyPrice
          const memberRate = dailyRateByEmployeeByServCode.get(employeeId)?.get(servCodeId) ?? 0;
          const groupRate = totalAvgDailyPriceByEmployee.get(employeeId) ?? 0;

          // Share of group drain this servCode gets from this employee
          const shareOfGroupDrain = isGroup && groupRate > 0
            ? (memberRate / groupRate) * employeeDailyRate
            : null;

          return (
            <div key={employeeId} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-foreground font-medium truncate max-w-[120px]">{name}</span>
                <span className="font-mono text-muted-foreground shrink-0">
                  {formatDollars(employeeDailyRate)}/day
                </span>
              </div>
              {isGroup && memberRate > 0 && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground pl-2">
                  <span>{servCodeId} rate</span>
                  <span className="font-mono">
                    {formatDollars(memberRate)}
                    {shareOfGroupDrain !== null && (
                      <span className="text-primary"> → {formatDollars(shareOfGroupDrain)}/day share</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
