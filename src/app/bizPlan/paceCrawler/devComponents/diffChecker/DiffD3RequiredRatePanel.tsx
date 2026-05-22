"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

function formatDollars(n: number): string {
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

export function DiffD3RequiredRatePanel() {
  const requiredMap = useSelector(
    employeeCardSelect.requiredDailyPriceByEmployeeByServCode,
  );
  const employeeMap = useSelector(employeeSelect.employeeMap);

  type Row = {
    employeeId: string;
    employeeName: string;
    servCodeId: string;
    activePool: number;
    remainingWeekdays: number;
    employeeShare: number;
    requiredDailyPrice: number;
    isOverdue: boolean;
  };

  const rows: Row[] = [];
  for (const [employeeId, byServCode] of requiredMap) {
    const name = employeeMap.get(employeeId)?.name ?? employeeId;
    for (const [, entry] of byServCode) {
      rows.push({
        employeeId,
        employeeName: name,
        servCodeId: entry.servCodeId,
        activePool: entry.activePool,
        remainingWeekdays: entry.remainingWeekdays,
        employeeShare: entry.employeeShare,
        requiredDailyPrice: entry.requiredDailyPrice,
        isOverdue: entry.isOverdue,
      });
    }
  }

  rows.sort((a, b) => {
    const nameCompare = a.employeeName.localeCompare(b.employeeName);
    return nameCompare !== 0
      ? nameCompare
      : a.servCodeId.localeCompare(b.servCodeId);
  });

  const overdueCount = rows.filter((r) => r.isOverdue).length;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        <strong className="text-foreground">D3 — Required Daily Price per Employee per ServCode.</strong>{" "}
        Employee&apos;s proportional share of the pool divided by remaining weekdays.
        Share is weighted by the employee&apos;s daily rate vs the team total (D2).
        ∞ = overdue (no remaining weekdays).
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Pool</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Days Left</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">My Share</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Required $/day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.employeeId}:${row.servCodeId}:${idx}`}
                className={row.isOverdue ? "bg-destructive/5" : "hover:bg-accent/5"}
              >
                <td className="px-2 py-1 border border-border">{row.employeeName}</td>
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {formatDollars(row.activePool)}
                </td>
                <td
                  className={`px-2 py-1 border border-border text-right font-mono ${
                    row.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {row.isOverdue ? "overdue" : row.remainingWeekdays}
                </td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {formatDollars(row.employeeShare)}
                </td>
                <td
                  className={`px-2 py-1 border border-border text-right font-mono font-semibold ${
                    row.isOverdue ? "text-destructive" : "text-primary"
                  }`}
                >
                  {formatDollars(row.requiredDailyPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {rows.length} employee × servCode pairs —{" "}
        <span className={overdueCount > 0 ? "text-destructive" : ""}>{overdueCount} overdue</span>
      </p>
    </div>
  );
}
