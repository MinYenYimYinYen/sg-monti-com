"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function DailyRatePanel() {
  const dailyRateMap = useSelector(paceCrawlerSelect.dailyRateByEmployeeByServCode);
  const lookbackPriceMap = useSelector(paceCrawlerSelect.employeeLookbackPriceMap);
  const programTypeMap = useSelector(paceCrawlerSelect.servCodeProgramTypeMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const rows: {
    employeeId: string;
    name: string;
    servCodeId: string;
    rate: number;
    isEstimated: boolean;
  }[] = [];

  for (const [employeeId, byServCode] of dailyRateMap) {
    const employee = employeeMap.get(employeeId);
    const name = employee?.name ?? employeeId;

    for (const [servCodeId, rate] of byServCode) {
      const programType = programTypeMap.get(servCodeId);
      const hasOwnRate =
        programType != null &&
        (lookbackPriceMap.get(employeeId)?.get(programType) ?? 0) > 0;

      rows.push({
        employeeId,
        name,
        servCodeId,
        rate,
        isEstimated: !hasOwnRate,
      });
    }
  }

  rows.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.servCodeId.localeCompare(b.servCodeId);
  });

  const estimatedCount = rows.filter((r) => r.isEstimated).length;
  const zeroRateCount = rows.filter((r) => r.rate === 0).length;

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Daily price rate per employee per servCode. Estimated = team-average fallback (no own lookback data).
        Zero rate = no team data — employee contributes nothing to the crawl for this servCode.
        {zeroRateCount > 0 && (
          <span className="text-destructive ml-1">
            {zeroRateCount} zero-rate entr{zeroRateCount !== 1 ? "ies" : "y"} — these servCodes will not drain.
          </span>
        )}
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">$/day</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.employeeId}:${row.servCodeId}`}
              className={row.rate === 0 ? "bg-destructive/5" : "hover:bg-accent/5"}
            >
              <td className="px-2 py-1 border border-border">{row.name}</td>
              <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
              <td className={`px-2 py-1 border border-border text-right font-mono ${row.rate === 0 ? "text-destructive" : row.isEstimated ? "text-muted-foreground" : "text-accent"}`}>
                ${row.rate.toFixed(2)}
              </td>
              <td className="px-2 py-1 border border-border text-muted-foreground text-[10px]">
                {row.rate === 0 ? "no data" : row.isEstimated ? "team avg" : "own lookback"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {rows.length} entries — {estimatedCount} estimated, {rows.length - estimatedCount} own lookback
      </p>
    </div>
  );
}
