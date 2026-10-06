"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { BurndownSeries, burndownSelect } from "@/app/pace/burndown/burndownSelect";
import { formatDollars, formatDate } from "@/app/pace/burndown/_components/burndownHelpers";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";

// ---------------------------------------------------------------------------
// SeriesDetail — accordion table reading from CrawlerDay[]
//
// Three levels:
//   Day row (always visible) — click to expand group sub-rows
//   Group row (level 2, multi-member sequences only) — click to expand employee sub-rows
//   Employee row (level 3) — leaf node, no further expansion
//
// For synthetic (single-group) sequences (Option A):
//   The group level is skipped. Day rows expand directly to employee sub-rows.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmployeeRows({
  employees,
  employeeMap,
}: {
  employees: CrawlerDayGroup["employees"];
  employeeMap: Map<string, { name: string }>;
}) {
  if (employees.length === 0) return null;
  return (
    <>
      {employees.map((emp) => (
        <tr key={emp.employeeId} className="bg-accent/5">
          <td className="pl-8 pr-2 py-0.5 border-b border-border/20 text-[9px] text-muted-foreground font-mono" colSpan={2}>
            ↳↳ {employeeMap.get(emp.employeeId)?.name ?? emp.employeeId}
          </td>
          <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-accent">
            {emp.priceCompletedSoFar > 0 ? formatDollars(emp.priceCompletedSoFar) : "—"}
          </td>
          <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-muted-foreground">
            {emp.priceCompleted > 0 ? formatDollars(emp.priceCompleted) : "—"}
          </td>
          <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-muted-foreground">
            {emp.priceForecasted > 0 ? formatDollars(emp.priceForecasted) : "—"}
          </td>
          <td colSpan={2} />
        </tr>
      ))}
    </>
  );
}

function GroupRow({
  group,
  employeeMap,
}: {
  group: CrawlerDayGroup;
  employeeMap: Map<string, { name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasEmployees = group.employees.length > 0;

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-accent/10 ${group.cascadedToSuccessor ? "opacity-60" : ""}`}
        onClick={() => hasEmployees && setExpanded((v) => !v)}
      >
        <td className="pl-5 pr-2 py-0.5 border-b border-border/20 text-[9px] font-mono text-foreground" colSpan={2}>
          <span className="mr-1 text-muted-foreground">{hasEmployees ? (expanded ? "▾" : "▸") : " "}</span>
          ↳ {group.label}
          {group.cascadedToSuccessor && (
            <span className="ml-1.5 text-[8px] text-secondary bg-secondary/10 rounded px-1">cascade →</span>
          )}
        </td>
        <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-accent">
          {formatDollars(group.poolCompletedSoFar)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-foreground">
          {formatDollars(group.poolRemaining)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-muted-foreground">
          {group.priceCompleted > 0 ? formatDollars(group.priceCompleted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-muted-foreground">
          {group.priceForecasted > 0 ? formatDollars(group.priceForecasted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/20 text-right text-[9px] font-mono text-muted-foreground">
          {Math.round(group.percentCompleted * 100)}%
        </td>
      </tr>
      {expanded && (
        <EmployeeRows employees={group.employees} employeeMap={employeeMap} />
      )}
    </>
  );
}

function DayRowSynthetic({
  day,
  groupId,
  mainDate,
  employeeMap,
}: {
  day: CrawlerDay;
  groupId: string;
  mainDate: string;
  employeeMap: Map<string, { name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const group = day.groups.find((g) => g.groupId === groupId);
  if (!group) return null;

  const isPast = day.date <= mainDate;
  const isToday = day.date === mainDate;
  const hasEmployees = group.employees.length > 0;

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-accent/10 ${isToday ? "bg-secondary/10" : isPast ? "" : "opacity-70"}`}
        onClick={() => hasEmployees && setExpanded((v) => !v)}
      >
        <td className="px-2 py-0.5 border-b border-border/30 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
          <span className="mr-1 text-muted-foreground/60">{hasEmployees ? (expanded ? "▾" : "▸") : " "}</span>
          {formatDate(day.date)}
          {isToday && <span className="ml-1 text-[8px] text-secondary">← today</span>}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-[9px] text-muted-foreground">
          <span className={`rounded px-1 py-0.5 text-[8px] ${isPast ? "bg-accent/10 text-accent" : "bg-muted/20 text-muted-foreground"}`}>
            {day.phase}
          </span>
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-accent">
          {formatDollars(group.poolCompletedSoFar)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-foreground">
          {formatDollars(group.poolRemaining)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {group.priceCompleted > 0 ? formatDollars(group.priceCompleted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {group.priceForecasted > 0 ? formatDollars(group.priceForecasted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {Math.round(group.percentCompleted * 100)}%
        </td>
      </tr>
      {expanded && (
        <EmployeeRows employees={group.employees} employeeMap={employeeMap} />
      )}
    </>
  );
}

function DayRowSequence({
  day,
  mainDate,
  sequenceId,
  employeeMap,
  cumulativeByDate,
}: {
  day: CrawlerDay;
  mainDate: string;
  sequenceId: string;
  employeeMap: Map<string, { name: string }>;
  cumulativeByDate: Map<string, { completed: number; remaining: number; totalPool: number; percentCompleted: number }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const sequenceGroups = day.groups.filter((g) => g.sequenceId === sequenceId);
  if (sequenceGroups.length === 0) return null;

  const isPast = day.date <= mainDate;
  const isToday = day.date === mainDate;
  const hasCascade = sequenceGroups.some((g) => g.cascadedToSuccessor);

  // Use sequence-level cumulative from CrawlerDayUtils — correctly accounts for
  // all groups ever seen, not just active ones. Prevents Completed/Remaining/% from
  // resetting at cascade transitions.
  const cumulative = cumulativeByDate.get(day.date);
  const totalCompleted = cumulative?.completed ?? sequenceGroups.reduce((sum, g) => sum + g.poolCompletedSoFar, 0);
  const totalRemaining = cumulative?.remaining ?? sequenceGroups.reduce((sum, g) => sum + g.poolRemaining, 0);
  const percentCompleted = cumulative?.percentCompleted ?? 0;

  // Day $ and Forecast $ are still per-day sums (not cumulative)
  const priceCompleted = sequenceGroups.reduce((sum, g) => sum + g.priceCompleted, 0);
  const priceForecasted = sequenceGroups.reduce((sum, g) => sum + g.priceForecasted, 0);

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-accent/10 ${isToday ? "bg-secondary/10" : isPast ? "" : "opacity-70"}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-2 py-0.5 border-b border-border/30 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
          <span className="mr-1 text-muted-foreground/60">{expanded ? "▾" : "▸"}</span>
          {formatDate(day.date)}
          {isToday && <span className="ml-1 text-[8px] text-secondary">← today</span>}
          {hasCascade && <span className="ml-1 text-[9px]">⚡</span>}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-[9px] text-muted-foreground">
          <span className={`rounded px-1 py-0.5 text-[8px] ${isPast ? "bg-accent/10 text-accent" : "bg-muted/20 text-muted-foreground"}`}>
            {day.phase}
          </span>
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-accent">
          {formatDollars(totalCompleted)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-foreground">
          {formatDollars(totalRemaining)}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {priceCompleted > 0 ? formatDollars(priceCompleted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {priceForecasted > 0 ? formatDollars(priceForecasted) : "—"}
        </td>
        <td className="px-2 py-0.5 border-b border-border/30 text-right font-mono text-[10px] text-muted-foreground">
          {Math.round(percentCompleted * 100)}%
        </td>
      </tr>
      {expanded && sequenceGroups.map((group) => (
        <GroupRow key={group.groupId} group={group} employeeMap={employeeMap} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SeriesDetail({ series }: { series: BurndownSeries }) {
  const mainDate = useSelector(burndownSelect.mainDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const isSynthetic = series.kind === "group";

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{series.label}</h2>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span
            className={`rounded px-1.5 py-0.5 ${series.kind === "sequence" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}
          >
            {series.kind}
          </span>
          <span>Total pool: {formatDollars(series.totalPool)}</span>
          {series.plannedEnd && <span>Planned end: {formatDate(series.plannedEnd)}</span>}
          {series.projectedEndDate && (
            <span
              className={
                series.projectedEndDate > (series.plannedEnd ?? "")
                  ? "text-destructive font-semibold"
                  : "text-accent font-semibold"
              }
            >
              Projected end: {formatDate(series.projectedEndDate)}
            </span>
          )}
        </div>
      </div>

      {/* Placeholder chart area */}
      <div className="border border-border rounded-lg bg-card p-6 flex flex-col items-center justify-center gap-3 min-h-48 mb-4">
        <p className="text-sm text-muted-foreground font-semibold">Burndown Chart</p>
        <p className="text-[11px] text-muted-foreground text-center max-w-sm">
          Chart UI is deferred. The data is wired up and verifiable in the table below. The chart
          will show actual history (left of {formatDate(mainDate)}) and projected trajectory
          (right).
        </p>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-primary" />
            <span>Actual (past)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-primary/40 border-dashed border-t border-primary/40" />
            <span>Projected (future)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0 h-3 border-l border-secondary" />
            <span>Planned end</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0 h-3 border-l border-destructive" />
            <span>Projected end</span>
          </div>
        </div>
      </div>

      {/* Accordion table */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Crawl History ({series.crawlerDays.length} days)
          {!isSynthetic && (
            <span className="ml-2 font-normal normal-case">
              — click a day to see group breakdown · click a group to see crew
            </span>
          )}
          {isSynthetic && (
            <span className="ml-2 font-normal normal-case">
              — click a day to see crew
            </span>
          )}
        </p>
        <table className="text-xs border-separate border-spacing-0 w-full max-w-3xl">
          <thead>
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold text-[10px]">Date</th>
              <th className="text-left px-2 py-1 border border-border font-semibold text-[10px]">Phase</th>
              <th className="text-right px-2 py-1 border border-border font-semibold text-[10px]">Completed</th>
              <th className="text-right px-2 py-1 border border-border font-semibold text-[10px]">Remaining</th>
              <th className="text-right px-2 py-1 border border-border font-semibold text-[10px]">Day $</th>
              <th className="text-right px-2 py-1 border border-border font-semibold text-[10px]">Forecast $</th>
              <th className="text-right px-2 py-1 border border-border font-semibold text-[10px]">%</th>
            </tr>
          </thead>
          <tbody>
            {series.crawlerDays.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-[10px] text-muted-foreground border border-border">
                  No crawl data yet. Set goals and configure a season plan.
                </td>
              </tr>
            )}
            {isSynthetic && series.singleGroupId
              ? series.crawlerDays.map((day, idx) => (
                  <DayRowSynthetic
                    key={idx}
                    day={day}
                    groupId={series.singleGroupId!}
                    mainDate={mainDate}
                    employeeMap={employeeMap}
                  />
                ))
              : (() => {
                  // Pre-compute sequence-level cumulative once for all rows
                  const cumulativeByDate = CrawlerDayUtils.sequenceCumulativeByDate(series.crawlerDays, series.id);
                  return series.crawlerDays.map((day, idx) => (
                    <DayRowSequence
                      key={idx}
                      day={day}
                      mainDate={mainDate}
                      sequenceId={series.id}
                      employeeMap={employeeMap}
                      cumulativeByDate={cumulativeByDate}
                    />
                  ));
                })()
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
