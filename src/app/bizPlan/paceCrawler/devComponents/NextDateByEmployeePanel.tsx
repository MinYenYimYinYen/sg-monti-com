"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";

export function NextDateByEmployeePanel() {
  const nextDateMap = useSelector(paceCrawlerSelect.nextDateByEmployee);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const today = useSelector(cascadeSelect.mainDate);

  const rows = [...employeeMap.values()]
    .filter((e) => e.active && e.servCodeIds.length > 0)
    .map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name,
      nextDate: nextDateMap.get(employee.employeeId) ?? today,
      hasPrintedServices: nextDateMap.has(employee.employeeId),
    }))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Next available date per employee — the earliest day they can work unscheduled jobs.
        Employees with no printed services default to next weekday after today.
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Next Available</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId} className="hover:bg-accent/5">
              <td className="px-2 py-1 border border-border">{row.name}</td>
              <td className="px-2 py-1 border border-border font-mono">{row.nextDate}</td>
              <td className="px-2 py-1 border border-border text-muted-foreground">
                {row.hasPrintedServices ? "printed schedDate" : "next weekday (no printed)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">{rows.length} active employees</p>
    </div>
  );
}
