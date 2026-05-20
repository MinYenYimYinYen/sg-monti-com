"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function CrawlerResultPanel() {
  const crawlerResult = useSelector(paceCrawlerSelect.crawlerResult);
  const activePoolMap = useSelector(paceCrawlerSelect.activePoolPriceByServCode);
  const progCodes = useSelector(progServSelect.progCodes);
  const today = useSelector(cascadeSelect.mainDate);

  const rows = progCodes.flatMap((progCode) =>
    progCode.servCodes.map((sc) => {
      const result = crawlerResult.byServCode.get(sc.servCodeId);
      const pool = activePoolMap.get(sc.servCodeId) ?? 0;
      const currentMin = sc.alwaysAsap ? today : (sc.dateRange.min ?? "");
      const currentMax = sc.alwaysAsap ? today : (sc.dateRange.max ?? "");
      const projectedEnd = result?.projectedEndDate ?? null;
      const proposedMax = result?.proposedMax ?? currentMax;

      // Color signal: is the projected end before or after the current max?
      let endColor = "text-muted-foreground";
      if (projectedEnd && currentMax) {
        endColor = projectedEnd <= currentMax ? "text-accent" : "text-destructive";
      }

      return {
        servCodeId: sc.servCodeId,
        progCodeId: progCode.progCodeId,
        runsInSequence: progCode.runsInSequence,
        resolvedFloor: result?.resolvedOpenDateFloor ?? "—",
        currentMin,
        projectedEnd,
        proposedMin: result?.proposedMin ?? "—",
        proposedMax,
        currentMax,
        pool,
        endColor,
        hasWork: pool > 0,
      };
    }),
  ).sort((a, b) => {
    const minCompare = (a.proposedMin ?? "").localeCompare(b.proposedMin ?? "");
    return minCompare !== 0 ? minCompare : a.servCodeId.localeCompare(b.servCodeId);
  });

  const withProjection = rows.filter((r) => r.projectedEnd !== null).length;
  const withWork = rows.filter((r) => r.hasWork).length;
  const noData = rows.filter((r) => r.hasWork && r.projectedEnd === null).length;

  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  console.log("[CrawlerResultPanel] assignmentPlans:", assignmentPlans.map((ap) => ({
    employeeId: ap.employeeId,
    name: employeeMap.get(ap.employeeId)?.name ?? ap.employeeId,
    servCodeIds: ap.servCodeIds,
  })));

  console.log("[CrawlerResultPanel] rows:", rows.map((r) => ({
    servCodeId: r.servCodeId,
    progCodeId: r.progCodeId,
    resolvedFloor: r.resolvedFloor,
    currentMin: r.currentMin,
    projectedEnd: r.projectedEnd,
    proposedMin: r.proposedMin,
    proposedMax: r.proposedMax,
    currentMax: r.currentMax,
    pool: r.pool,
  })));

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        Day-crawl result — projected drain date and proposed date ranges per servCode.
        Green = finishes before current max. Red = finishes after (behind schedule). — = no projection (zero rate or zero pool).
        Today: {today}
      </p>

      {/* Scrollable table with sticky header */}
      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Prog</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Open Floor</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Curr Min</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Proj End</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Prop Min</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Prop Max</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Curr Max</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">$ Pool</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.servCodeId}
                className={row.hasWork ? "hover:bg-accent/5" : "opacity-40"}
              >
                <td className="px-2 py-1 border border-border font-mono">
                  {row.servCodeId}
                  {row.runsInSequence && (
                    <span className="ml-1 text-[9px] text-primary">seq</span>
                  )}
                </td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{row.progCodeId}</td>
                <td className="px-2 py-1 border border-border font-mono">{formatDate(row.resolvedFloor)}</td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMin)}</td>
                <td className={`px-2 py-1 border border-border font-mono font-semibold ${row.endColor}`}>
                  {formatDate(row.projectedEnd)}
                </td>
                <td className="px-2 py-1 border border-border font-mono">{formatDate(row.proposedMin)}</td>
                <td className="px-2 py-1 border border-border font-mono">{formatDate(row.proposedMax)}</td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMax)}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                  {row.pool > 0 ? `$${Math.round(row.pool).toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {rows.length} servCodes — {withWork} with work, {withProjection} projected, {noData} no-data (zero rate)
      </p>
    </div>
  );
}
