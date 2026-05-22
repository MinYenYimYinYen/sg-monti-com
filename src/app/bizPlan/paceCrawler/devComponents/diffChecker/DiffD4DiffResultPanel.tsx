"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

function formatDollars(n: number): string {
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatPercent(n: number | null): string {
  if (n === null) return "—";
  if (!isFinite(n)) return "∞";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

export function DiffD4DiffResultPanel() {
  const diffMap = useSelector(employeeCardSelect.diffResultByEmployeeByServCode);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  type Row = {
    employeeId: string;
    employeeName: string;
    servCodeId: string;
    historicalDailyPrice: number;
    requiredDailyPrice: number;
    diffPrice: number;
    diffPercent: number | null;
    isOverdue: boolean;
    isAhead: boolean;
    isBehind: boolean;
  };

  const rows: Row[] = [];
  for (const [employeeId, byServCode] of diffMap) {
    const name = employeeMap.get(employeeId)?.name ?? employeeId;
    for (const [, entry] of byServCode) {
      rows.push({
        employeeId,
        employeeName: name,
        servCodeId: entry.servCodeId,
        historicalDailyPrice: entry.historicalDailyPrice,
        requiredDailyPrice: entry.requiredDailyPrice,
        diffPrice: entry.diffPrice,
        diffPercent: entry.diffPercent,
        isOverdue: entry.isOverdue,
        isAhead: entry.isAhead,
        isBehind: entry.isBehind,
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
  const aheadCount = rows.filter((r) => r.isAhead).length;
  const behindCount = rows.filter((r) => r.isBehind && !r.isOverdue).length;
  const onTrackCount = rows.length - overdueCount - aheadCount - behindCount;

  function rowColor(row: Row): string {
    if (row.isOverdue) return "bg-destructive/5";
    if (row.isAhead) return "bg-accent/5";
    if (row.isBehind) return "bg-secondary/5";
    return "hover:bg-accent/5";
  }

  function diffColor(row: Row): string {
    if (row.isOverdue) return "text-destructive";
    if (row.isAhead) return "text-accent";
    if (row.isBehind) return "text-secondary";
    return "text-muted-foreground";
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        <strong className="text-foreground">D4 — Diff Result per Employee per ServCode.</strong>{" "}
        Required $/day (D3) vs historical avg $/day (simulator baseline).
        <span className="text-accent ml-1">Green = ahead</span> (producing more than needed).
        <span className="text-secondary ml-1">Orange = behind</span> (needs to do more).
        <span className="text-destructive ml-1">Red = overdue</span> (window has passed).
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Historical $/day</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Required $/day</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Diff $</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Diff %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.employeeId}:${row.servCodeId}:${idx}`}
                className={rowColor(row)}
              >
                <td className="px-2 py-1 border border-border">{row.employeeName}</td>
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {formatDollars(row.historicalDailyPrice)}
                </td>
                <td className="px-2 py-1 border border-border text-right font-mono text-primary font-semibold">
                  {row.isOverdue ? "∞" : formatDollars(row.requiredDailyPrice)}
                </td>
                <td className={`px-2 py-1 border border-border text-right font-mono font-semibold ${diffColor(row)}`}>
                  {row.isOverdue
                    ? "overdue"
                    : isFinite(row.diffPrice)
                      ? (row.diffPrice > 0 ? "+" : "") + formatDollars(row.diffPrice)
                      : "∞"}
                </td>
                <td className={`px-2 py-1 border border-border text-right font-mono ${diffColor(row)}`}>
                  {row.isOverdue ? "—" : formatPercent(row.diffPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {rows.length} pairs —{" "}
        <span className="text-accent">{aheadCount} ahead</span>,{" "}
        <span className="text-secondary">{behindCount} behind</span>,{" "}
        {onTrackCount} on track,{" "}
        <span className={overdueCount > 0 ? "text-destructive" : ""}>{overdueCount} overdue</span>
      </p>
    </div>
  );
}
