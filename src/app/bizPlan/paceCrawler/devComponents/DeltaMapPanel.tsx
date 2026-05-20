"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";

const ON_PACE_THRESHOLD = 2;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function deltaDaysColor(deltaDays: number): string {
  if (deltaDays > ON_PACE_THRESHOLD) return "text-destructive";
  if (deltaDays < -ON_PACE_THRESHOLD) return "text-primary";
  return "text-accent";
}

function formatDelta(deltaDays: number): string {
  return deltaDays > 0 ? `+${deltaDays}d` : `${deltaDays}d`;
}

export function DeltaMapPanel() {
  const deltaMap = useSelector(paceCrawlerSelect.servCodeDeltaMap);
  const completionMap = useSelector(paceCrawlerSelect.progCodeProjectedCompletionMap);
  const progCodes = useSelector(progServSelect.progCodes);

  const rows = progCodes.flatMap((progCode) => {
    const completion = completionMap.get(progCode.progCodeId);
    return progCode.servCodes.map((sc) => {
      const delta = deltaMap.get(sc.servCodeId);
      return {
        servCodeId: sc.servCodeId,
        progCodeId: progCode.progCodeId,
        projectedEnd: delta?.projectedEndDate ?? null,
        currentMax: sc.dateRange.max ?? null,
        deltaDays: delta?.deltaDays ?? null,
        progCompletion: completion?.date ?? null,
        progIsEstimated: completion?.isEstimated ?? false,
      };
    });
  }).sort((a, b) => {
    const dateA = a.currentMax ?? "";
    const dateB = b.currentMax ?? "";
    return dateA.localeCompare(dateB) || a.servCodeId.localeCompare(b.servCodeId);
  });

  const behind = rows.filter((r) => (r.deltaDays ?? 0) > ON_PACE_THRESHOLD).length;
  const ahead = rows.filter((r) => (r.deltaDays ?? 0) < -ON_PACE_THRESHOLD).length;
  const onPace = rows.filter((r) => r.deltaDays != null && Math.abs(r.deltaDays) <= ON_PACE_THRESHOLD).length;
  const noData = rows.filter((r) => r.deltaDays == null).length;

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Delta days per servCode — projected end vs current max. Positive = behind, negative = ahead.
        On-pace threshold: ±{ON_PACE_THRESHOLD} days.
      </p>

      {/* ProgCode completion summary */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1">ProgCode Projected Completion</p>
        <div className="flex flex-wrap gap-2">
          {progCodes.map((progCode) => {
            const completion = completionMap.get(progCode.progCodeId);
            if (!completion?.date) return null;
            return (
              <span
                key={progCode.progCodeId}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${completion.isEstimated ? "bg-muted/30 text-muted-foreground" : "bg-accent/10 text-accent"}`}
                title={completion.isEstimated ? "Estimated (no lookback data)" : "Projected"}
              >
                {progCode.progCodeId}: {formatDate(completion.date)}
                {completion.isEstimated && " ~"}
              </span>
            );
          })}
        </div>
      </div>

      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Prog</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Proj End</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Curr Max</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.servCodeId} className="hover:bg-accent/5">
              <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
              <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{row.progCodeId}</td>
              <td className="px-2 py-1 border border-border font-mono">{formatDate(row.projectedEnd)}</td>
              <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMax)}</td>
              <td className={`px-2 py-1 border border-border text-right font-mono font-semibold ${row.deltaDays != null ? deltaDaysColor(row.deltaDays) : "text-muted-foreground"}`}>
                {row.deltaDays != null ? formatDelta(row.deltaDays) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {rows.length} servCodes — {behind} behind, {onPace} on pace, {ahead} ahead, {noData} no data
      </p>
    </div>
  );
}
