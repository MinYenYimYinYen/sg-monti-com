"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";

export function DailyRatePanel() {
  const dailyRateMap = useSelector(paceCrawlerSelect.dailyRateByEmployeeByServCode);
  const lookbackPriceMap = useSelector(paceCrawlerSelect.employeeLookbackPriceMap);
  const totalAvgDailyPriceMap = useSelector(paceCrawlerSelect.totalAvgDailyPriceByEmployee);
  const programTypeMap = useSelector(paceCrawlerSelect.servCodeProgramTypeMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const groupMap = useSelector(assignmentGroupSelect.groupMap);

  type Row = {
    employeeId: string;
    name: string;
    entryLabel: string;
    rate: number;
    isEstimated: boolean;
    isGroup: boolean;
    groupMembers?: string[];
  };

  const rows: Row[] = [];

  for (const [employeeId, plan] of assignmentsByEmployeeId) {
    const employee = employeeMap.get(employeeId);
    const name = employee?.name ?? employeeId;
    const totalAvgDailyPrice = totalAvgDailyPriceMap.get(employeeId);

    for (const entry of plan.entries) {
      if (entry.kind === "single") {
        const { servCodeId } = entry;
        const rate = dailyRateMap.get(employeeId)?.get(servCodeId) ?? 0;
        const programType = programTypeMap.get(servCodeId);
        const hasOwnRate =
          programType != null &&
          (lookbackPriceMap.get(employeeId)?.get(programType) ?? 0) > 0;

        rows.push({
          employeeId,
          name,
          entryLabel: servCodeId,
          rate,
          isEstimated: !hasOwnRate,
          isGroup: false,
        });
      } else {
        // Group entry — uses totalAvgDailyPrice
        // Support both old format (inline servCodeIds) and new format (groupId reference)
        const groupEntry = entry as { kind: "group"; groupId?: string; servCodeIds?: string[]; label?: string };
        const resolvedGroup = groupEntry.groupId ? groupMap.get(groupEntry.groupId) : null;
        const servCodeIds = resolvedGroup?.servCodeIds ?? groupEntry.servCodeIds ?? [];
        const label = resolvedGroup?.label ?? groupEntry.label ?? groupEntry.groupId ?? servCodeIds.join("+");
        const rate = totalAvgDailyPrice ?? 0;
        const hasRate = rate > 0;

        rows.push({
          employeeId,
          name,
          entryLabel: label,
          rate,
          isEstimated: !hasRate,
          isGroup: true,
          groupMembers: servCodeIds,
        });
      }
    }
  }

  rows.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.entryLabel.localeCompare(b.entryLabel);
  });

  const estimatedCount = rows.filter((r) => r.isEstimated).length;
  const zeroRateCount = rows.filter((r) => r.rate === 0).length;
  const groupCount = rows.filter((r) => r.isGroup).length;

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Daily price rate per employee per entry. Groups use <strong className="text-foreground">Total $/day</strong> (full daily capacity).
        Singles use per-programType lookback rate. Estimated = team-average fallback.
        Zero rate = no data — entry will not drain.
        {zeroRateCount > 0 && (
          <span className="text-destructive ml-1">
            {zeroRateCount} zero-rate entr{zeroRateCount !== 1 ? "ies" : "y"} — these will not drain.
          </span>
        )}
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Entry</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">$/day</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.employeeId}:${row.entryLabel}:${idx}`}
              className={row.rate === 0 ? "bg-destructive/5" : row.isGroup ? "bg-primary/5" : "hover:bg-accent/5"}
            >
              <td className="px-2 py-1 border border-border">{row.name}</td>
              <td className="px-2 py-1 border border-border font-mono">
                <span className={row.isGroup ? "text-primary font-semibold" : "text-foreground"}>
                  {row.entryLabel}
                </span>
                {row.isGroup && (
                  <span className="ml-1 text-[9px] text-primary bg-primary/10 rounded px-1">group</span>
                )}
                {row.isGroup && row.groupMembers && (
                  <span className="ml-1 text-[9px] text-muted-foreground">
                    ({row.groupMembers.join(", ")})
                  </span>
                )}
              </td>
              <td className={`px-2 py-1 border border-border text-right font-mono ${row.rate === 0 ? "text-destructive" : row.isGroup ? "text-primary" : row.isEstimated ? "text-muted-foreground" : "text-accent"}`}>
                ${row.rate.toFixed(2)}
              </td>
              <td className="px-2 py-1 border border-border text-muted-foreground text-[10px]">
                {row.rate === 0
                  ? "no data"
                  : row.isGroup
                    ? "total (group)"
                    : row.isEstimated
                      ? "team avg"
                      : "own lookback"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {rows.length} entries — {groupCount} groups, {estimatedCount} estimated, {rows.length - estimatedCount - groupCount} own lookback
      </p>
    </div>
  );
}
