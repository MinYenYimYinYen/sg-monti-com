"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function LookbackPricePanel() {
  const lookbackPriceMap = useSelector(paceCrawlerSelect.employeeLookbackPriceMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  // Flatten to rows: one row per employee × programType combination.
  const rows: { employeeId: string; name: string; programType: string; avgDailyPrice: number }[] = [];

  for (const [employeeId, byProgramType] of lookbackPriceMap) {
    const employee = employeeMap.get(employeeId);
    const name = employee?.name ?? employeeId;
    for (const [programType, avgDailyPrice] of byProgramType) {
      rows.push({ employeeId, name, programType, avgDailyPrice });
    }
  }

  rows.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.programType.localeCompare(b.programType);
  });

  const assignedEmployeeCount = [...employeeMap.values()].filter(
    (e) => e.active && e.servCodeIds.length > 0,
  ).length;
  const employeesWithLookback = lookbackPriceMap.size;
  const employeesWithoutLookback = assignedEmployeeCount - employeesWithLookback;

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Avg daily price per employee per programType — sourced from the lookback window.
        Employees without lookback data will receive a team-average fallback in A5.
        {employeesWithoutLookback > 0 && (
          <span className="text-destructive ml-1">
            {employeesWithoutLookback} assigned employee{employeesWithoutLookback !== 1 ? "s" : ""} have no lookback data.
          </span>
        )}
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ProgramType</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">Avg $/day</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.employeeId}:${row.programType}`} className="hover:bg-accent/5">
              <td className="px-2 py-1 border border-border">{row.name}</td>
              <td className="px-2 py-1 border border-border text-muted-foreground font-mono">{row.programType}</td>
              <td className="px-2 py-1 border border-border text-right font-mono text-accent">
                ${row.avgDailyPrice.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {employeesWithLookback} of {assignedEmployeeCount} assigned employees have lookback data
      </p>
    </div>
  );
}
