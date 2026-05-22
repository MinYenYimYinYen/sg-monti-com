"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function DiffD1RemainingWeekdaysPanel() {
  const remainingMap = useSelector(employeeCardSelect.remainingWeekdaysByServCode);
  const servCodeMap = useSelector(progServSelect.servCodeMap);
  const mainDate = useSelector(paceCrawlerSelect.mainDate);

  type Row = {
    servCodeId: string;
    scMax: string;
    remainingWeekdays: number;
    isOverdue: boolean;
  };

  const rows: Row[] = [];
  for (const [servCodeId, remaining] of remainingMap) {
    const servCode = servCodeMap.get(servCodeId);
    rows.push({
      servCodeId,
      scMax: servCode?.dateRange.max ?? "—",
      remainingWeekdays: remaining,
      isOverdue: remaining <= 0,
    });
  }

  rows.sort((a, b) => a.scMax.localeCompare(b.scMax) || a.servCodeId.localeCompare(b.servCodeId));

  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const futureCount = rows.filter((r) => r.remainingWeekdays > 0).length;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        <strong className="text-foreground">D1 — Remaining Weekdays per ServCode.</strong>{" "}
        Weekdays from <span className="font-mono">{mainDate}</span> to{" "}
        <span className="font-mono">servCode.dateRange.max</span> (inclusive of max, exclusive of today).
        Negative = overdue. <span className="text-destructive">alwaysAsap servCodes excluded</span> (no committed window).
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">SC Max</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Remaining Weekdays</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.servCodeId}
                className={row.isOverdue ? "bg-destructive/5" : "hover:bg-accent/5"}
              >
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                  {formatDate(row.scMax)}
                </td>
                <td
                  className={`px-2 py-1 border border-border text-right font-mono font-semibold ${
                    row.isOverdue ? "text-destructive" : "text-accent"
                  }`}
                >
                  {row.remainingWeekdays}
                </td>
                <td className="px-2 py-1 border border-border text-[10px]">
                  {row.isOverdue ? (
                    <span className="text-destructive font-medium">overdue</span>
                  ) : (
                    <span className="text-accent">on track</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {rows.length} servCodes — {futureCount} with remaining days,{" "}
        <span className={overdueCount > 0 ? "text-destructive" : ""}>{overdueCount} overdue</span>
      </p>
    </div>
  );
}
