"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function DiffD0OpenServCodesPanel() {
  const openServCodesForEmployees = useSelector(
    employeeCardSelect.openServCodesForEmployees,
  );
  const mainDate = useSelector(paceCrawlerSelect.mainDate);

  type Row = {
    employeeName: string;
    employeeId: string;
    servCodeId: string;
    servicesCount: number;
    scMin: string;
    scMax: string;
    alwaysAsap: boolean;
  };

  const rows: Row[] = [];
  for (const { employee, openServCodes } of openServCodesForEmployees) {
    for (const servCode of openServCodes) {
      rows.push({
        employeeName: employee.name,
        employeeId: employee.employeeId,
        servCodeId: servCode.servCodeId,
        servicesCount: servCode.services.length,
        scMin: servCode.alwaysAsap ? "asap" : (servCode.dateRange.min ?? "—"),
        scMax: servCode.alwaysAsap ? "asap" : (servCode.dateRange.max ?? "—"),
        alwaysAsap: servCode.alwaysAsap,
      });
    }
  }

  rows.sort((a, b) => {
    const nameCompare = a.employeeName.localeCompare(b.employeeName);
    return nameCompare !== 0
      ? nameCompare
      : a.servCodeId.localeCompare(b.servCodeId);
  });

  const employeeCount = openServCodesForEmployees.length;
  const withOpenCount = openServCodesForEmployees.filter(
    (e) => e.openServCodes.length > 0,
  ).length;
  const asapCount = rows.filter((r) => r.alwaysAsap).length;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        <strong className="text-foreground">D0 — Open ServCodes per Employee.</strong>{" "}
        ServCodes that pass all three gates: (1) in employee&apos;s assignment plan,
        (2) <span className="font-mono">services.length &gt; 0</span>, and
        (3) <span className="font-mono">mainDate</span> within{" "}
        <span className="font-mono">dateRange</span> or <span className="font-mono">alwaysAsap</span>.
        Today: <span className="font-mono">{mainDate}</span>
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-right px-2 py-1 border border-border font-semibold"># Services</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">SC Min</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">SC Max</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.employeeId}:${row.servCodeId}:${idx}`}
                className={row.alwaysAsap ? "bg-secondary/5 hover:bg-secondary/10" : "hover:bg-accent/5"}
              >
                <td className="px-2 py-1 border border-border">{row.employeeName}</td>
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {row.servicesCount}
                </td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                  {formatDate(row.scMin)}
                </td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                  {formatDate(row.scMax)}
                </td>
                <td className="px-2 py-1 border border-border text-[10px]">
                  {row.alwaysAsap ? (
                    <span className="text-secondary font-medium">asap</span>
                  ) : (
                    <span className="text-accent">dated</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-3 border border-border text-center text-muted-foreground italic">
                  No open servCodes found. Check assignments and mainDate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {employeeCount} assigned employees — {withOpenCount} with open servCodes,{" "}
        {rows.length} total open rows ({asapCount} asap, {rows.length - asapCount} dated)
      </p>
    </div>
  );
}
