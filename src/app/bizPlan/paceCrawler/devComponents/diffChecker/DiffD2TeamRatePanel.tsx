"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function DiffD2TeamRatePanel() {
  const teamRateMap = useSelector(employeeCardSelect.teamDailyRateByServCode);
  const assignmentsByServCodeId = useSelector(assignmentPlanSelect.assignmentsByServCodeId);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  type Row = {
    servCodeId: string;
    teamDailyRate: number;
    assignedCount: number;
    assignedNames: string[];
    isZeroRate: boolean;
  };

  const rows: Row[] = [];
  for (const [servCodeId, teamRate] of teamRateMap) {
    const employeeIds = assignmentsByServCodeId.get(servCodeId) ?? [];
    const assignedNames = employeeIds.map(
      (id) => employeeMap.get(id)?.name ?? id,
    );
    rows.push({
      servCodeId,
      teamDailyRate: teamRate,
      assignedCount: employeeIds.length,
      assignedNames,
      isZeroRate: teamRate === 0,
    });
  }

  rows.sort((a, b) => {
    // Zero-rate rows first, then by servCodeId
    if (a.isZeroRate !== b.isZeroRate) return a.isZeroRate ? -1 : 1;
    return a.servCodeId.localeCompare(b.servCodeId);
  });

  const zeroCount = rows.filter((r) => r.isZeroRate).length;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        <strong className="text-foreground">D2 — Team Daily Rate per ServCode.</strong>{" "}
        Sum of all assigned employees&apos; daily rates for each servCode. This is the denominator
        used to compute each employee&apos;s proportional share of the pool.
        {zeroCount > 0 && (
          <span className="text-destructive ml-1">
            {zeroCount} servCode{zeroCount !== 1 ? "s" : ""} with zero team rate — no lookback data.
          </span>
        )}
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Team $/day</th>
              <th className="text-right px-2 py-1 border border-border font-semibold"># Assigned</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Employees</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.servCodeId}
                className={row.isZeroRate ? "bg-destructive/5" : "hover:bg-accent/5"}
              >
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td
                  className={`px-2 py-1 border border-border text-right font-mono font-semibold ${
                    row.isZeroRate ? "text-destructive" : "text-accent"
                  }`}
                >
                  {row.isZeroRate ? "—" : `$${Math.round(row.teamDailyRate).toLocaleString()}`}
                </td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {row.assignedCount}
                </td>
                <td className="px-2 py-1 border border-border text-muted-foreground text-[10px]">
                  {row.assignedNames.join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {rows.length} servCodes with assignments —{" "}
        <span className={zeroCount > 0 ? "text-destructive" : ""}>{zeroCount} zero-rate</span>,{" "}
        {rows.length - zeroCount} with data
      </p>
    </div>
  );
}
