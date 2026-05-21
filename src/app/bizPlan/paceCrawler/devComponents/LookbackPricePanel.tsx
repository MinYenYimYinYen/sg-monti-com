"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function LookbackPricePanel() {
  const lookbackPriceMap = useSelector(paceCrawlerSelect.employeeLookbackPriceMap);
  const totalAvgDailyPriceMap = useSelector(paceCrawlerSelect.totalAvgDailyPriceByEmployee);
  const teamAvgTotalDailyPrice = useSelector(paceCrawlerSelect.teamAvgTotalDailyPrice);
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

  // Assigned employees with no lookback data — they'll use the team-avg fallback
  const noLookbackEmployees = [...employeeMap.values()].filter(
    (e) => e.active && e.servCodeIds.length > 0 && !lookbackPriceMap.has(e.employeeId),
  );

  // Group rows by employee for display
  const employeeIds = [...new Set(rows.map((r) => r.employeeId))];

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Avg daily price per employee per programType — sourced from the lookback window.
        <strong className="text-foreground ml-1">Total $/day</strong> = cross-programType total used as the group drain rate.
        Employees without lookback data will receive a team-average fallback in the daily rate selector.
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
            <th className="text-right px-2 py-1 border border-border font-semibold">Total $/day</th>
          </tr>
        </thead>
        <tbody>
          {employeeIds.map((employeeId) => {
            const employeeRows = rows.filter((r) => r.employeeId === employeeId);
            const totalAvgDailyPrice = totalAvgDailyPriceMap.get(employeeId);
            return employeeRows.map((row, idx) => (
              <tr key={`${row.employeeId}:${row.programType}`} className="hover:bg-accent/5">
                <td className="px-2 py-1 border border-border">
                  {idx === 0 ? row.name : ""}
                </td>
                <td className="px-2 py-1 border border-border text-muted-foreground font-mono">{row.programType}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-accent">
                  ${row.avgDailyPrice.toFixed(2)}
                </td>
                <td className="px-2 py-1 border border-border text-right font-mono">
                  {idx === 0 && totalAvgDailyPrice != null ? (
                    <span className="text-primary font-semibold">${totalAvgDailyPrice.toFixed(2)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
      {/* Fallback section — employees using team-avg total */}
      {noLookbackEmployees.length > 0 && teamAvgTotalDailyPrice > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
            No-history employees — using team avg fallback
          </p>
          <table className="text-xs border-separate border-spacing-0 w-full">
            <tbody>
              {noLookbackEmployees.map((employee) => (
                <tr key={employee.employeeId} className="bg-muted/10">
                  <td className="px-2 py-1 border border-border text-muted-foreground">{employee.name}</td>
                  <td className="px-2 py-1 border border-border text-muted-foreground font-mono text-[10px]">no history</td>
                  <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">—</td>
                  <td className="px-2 py-1 border border-border text-right font-mono">
                    <span className="text-muted-foreground" title="Team average fallback">
                      ${teamAvgTotalDailyPrice.toFixed(2)} ~
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground mt-1">
            Team avg = ${teamAvgTotalDailyPrice.toFixed(2)}/day (average of {employeesWithLookback} employees with data)
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        {employeesWithLookback} of {assignedEmployeeCount} assigned employees have lookback data
      </p>
    </div>
  );
}
