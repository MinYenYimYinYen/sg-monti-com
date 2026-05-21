"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { ChevronRight } from "lucide-react";

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
  const activePoolMap = useSelector(paceCrawlerSelect.activePoolPriceByServCode);
  const progCodes = useSelector(progServSelect.progCodes);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build group registry from assignment plans
  type GroupEntry = { label: string; servCodeIds: string[]; key: string };
  const groupsByKey = new Map<string, GroupEntry>();

  for (const plan of assignmentsByEmployeeId.values()) {
    for (const entry of plan.entries) {
      if (entry.kind === "group") {
        const key = [...entry.servCodeIds].sort().join(",");
        if (!groupsByKey.has(key)) {
          groupsByKey.set(key, {
            label: entry.label ?? entry.servCodeIds.join("+"),
            servCodeIds: entry.servCodeIds,
            key,
          });
        }
      }
    }
  }

  const groupMemberIds = new Set<string>();
  for (const group of groupsByKey.values()) {
    for (const id of group.servCodeIds) groupMemberIds.add(id);
  }

  // Build servCode metadata
  const servCodeMeta = new Map<string, { progCodeId: string; currentMax: string | null }>();
  for (const progCode of progCodes) {
    for (const sc of progCode.servCodes) {
      servCodeMeta.set(sc.servCodeId, {
        progCodeId: progCode.progCodeId,
        currentMax: sc.dateRange.max ?? null,
      });
    }
  }

  type DisplayRow =
    | {
        kind: "group";
        label: string;
        key: string;
        servCodeIds: string[];
        progCodeId: string;
        projectedEnd: string | null;
        currentMax: string | null;
        deltaDays: number | null;
      }
    | {
        kind: "member";
        servCodeId: string;
        progCodeId: string;
        projectedEnd: string | null;
        currentMax: string | null;
        deltaDays: number | null;
        groupKey: string;
      }
    | {
        kind: "single";
        servCodeId: string;
        progCodeId: string;
        projectedEnd: string | null;
        currentMax: string | null;
        deltaDays: number | null;
      };

  const displayRows: DisplayRow[] = [];

  // Group rows — only show groups with at least one member that has a delta or pool
  for (const group of groupsByKey.values()) {
    const memberDeltas = group.servCodeIds.map((id) => deltaMap.get(id));
    const hasAnyData = memberDeltas.some((d) => d?.deltaDays != null || (activePoolMap.get(group.servCodeIds[0]) ?? 0) > 0);
    if (!hasAnyData) continue;

    const firstMeta = servCodeMeta.get(group.servCodeIds[0]);

    // Group delta = latest projectedEnd vs latest currentMax
    const memberEndDates = group.servCodeIds
      .map((id) => deltaMap.get(id)?.projectedEndDate)
      .filter((d): d is string => d != null);
    const projectedEnd = memberEndDates.length > 0 ? [...memberEndDates].sort().at(-1)! : null;

    const memberCurrentMaxes = group.servCodeIds
      .map((id) => servCodeMeta.get(id)?.currentMax)
      .filter((d): d is string => d != null);
    const currentMax = memberCurrentMaxes.length > 0 ? [...memberCurrentMaxes].sort().at(-1)! : null;

    // Use the delta from the member with the latest projectedEnd (the bottleneck)
    const bottleneckDelta = memberDeltas.find((d) => d?.projectedEndDate === projectedEnd);
    const deltaDays = bottleneckDelta?.deltaDays ?? null;

    displayRows.push({
      kind: "group",
      label: group.label,
      key: group.key,
      servCodeIds: group.servCodeIds,
      progCodeId: firstMeta?.progCodeId ?? "—",
      projectedEnd,
      currentMax,
      deltaDays,
    });

    // Member rows (shown when expanded)
    if (expandedGroups.has(group.key)) {
      for (const servCodeId of group.servCodeIds) {
        const delta = deltaMap.get(servCodeId);
        const meta = servCodeMeta.get(servCodeId);
        displayRows.push({
          kind: "member",
          servCodeId,
          progCodeId: meta?.progCodeId ?? "—",
          projectedEnd: delta?.projectedEndDate ?? null,
          currentMax: meta?.currentMax ?? null,
          deltaDays: delta?.deltaDays ?? null,
          groupKey: group.key,
        });
      }
    }
  }

  // Standalone single rows — only show servCodes with a delta (has work + projection)
  const singleRows = progCodes.flatMap((progCode) =>
    progCode.servCodes
      .filter((sc) => !groupMemberIds.has(sc.servCodeId))
      .map((sc) => {
        const delta = deltaMap.get(sc.servCodeId);
        return {
          kind: "single" as const,
          servCodeId: sc.servCodeId,
          progCodeId: progCode.progCodeId,
          projectedEnd: delta?.projectedEndDate ?? null,
          currentMax: sc.dateRange.max ?? null,
          deltaDays: delta?.deltaDays ?? null,
        };
      })
      .filter((row) => row.deltaDays != null), // hide null-delta rows
  ).sort((a, b) => {
    const dateA = a.currentMax ?? "";
    const dateB = b.currentMax ?? "";
    return dateA.localeCompare(dateB) || a.servCodeId.localeCompare(b.servCodeId);
  });

  displayRows.push(...singleRows);

  const behind = singleRows.filter((r) => (r.deltaDays ?? 0) > ON_PACE_THRESHOLD).length;
  const ahead = singleRows.filter((r) => (r.deltaDays ?? 0) < -ON_PACE_THRESHOLD).length;
  const onPace = singleRows.filter((r) => r.deltaDays != null && Math.abs(r.deltaDays) <= ON_PACE_THRESHOLD).length;

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Delta days per servCode — projected end vs current max. Positive = behind, negative = ahead.
        On-pace threshold: ±{ON_PACE_THRESHOLD} days. ServCodes with no projection are hidden.
        Groups show combined delta. Click ▶ to expand members.
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
            <th className="text-left px-2 py-1 border border-border font-semibold">Entry</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Prog</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Proj End</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Curr Max</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">Delta</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => {
            if (row.kind === "group") {
              const isExpanded = expandedGroups.has(row.key);
              return (
                <tr
                  key={`group:${row.key}`}
                  className="bg-primary/5 hover:bg-primary/10 cursor-pointer"
                  onClick={() => toggleGroup(row.key)}
                >
                  <td className="px-2 py-1 border border-border font-mono">
                    <span className="flex items-center gap-1">
                      <ChevronRight
                        className={`w-3 h-3 text-primary shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <span className="text-primary font-semibold">{row.label}</span>
                      <span className="text-[9px] text-primary bg-primary/10 rounded px-1 ml-1">group</span>
                    </span>
                  </td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{row.progCodeId}</td>
                  <td className="px-2 py-1 border border-border font-mono">{formatDate(row.projectedEnd)}</td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMax)}</td>
                  <td className={`px-2 py-1 border border-border text-right font-mono font-semibold ${row.deltaDays != null ? deltaDaysColor(row.deltaDays) : "text-muted-foreground"}`}>
                    {row.deltaDays != null ? formatDelta(row.deltaDays) : "—"}
                  </td>
                </tr>
              );
            }

            if (row.kind === "member") {
              return (
                <tr key={`member:${row.servCodeId}:${idx}`} className="bg-primary/3 hover:bg-primary/5">
                  <td className="px-2 py-1 border border-border font-mono pl-6 text-muted-foreground">
                    ↳ {row.servCodeId}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{row.progCodeId}</td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.projectedEnd)}</td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMax)}</td>
                  <td className={`px-2 py-1 border border-border text-right font-mono ${row.deltaDays != null ? deltaDaysColor(row.deltaDays) : "text-muted-foreground"}`}>
                    {row.deltaDays != null ? formatDelta(row.deltaDays) : "—"}
                  </td>
                </tr>
              );
            }

            // single
            return (
              <tr key={`single:${row.servCodeId}`} className="hover:bg-accent/5">
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{row.progCodeId}</td>
                <td className="px-2 py-1 border border-border font-mono">{formatDate(row.projectedEnd)}</td>
                <td className="px-2 py-1 border border-border font-mono text-muted-foreground">{formatDate(row.currentMax)}</td>
                <td className={`px-2 py-1 border border-border text-right font-mono font-semibold ${row.deltaDays != null ? deltaDaysColor(row.deltaDays) : "text-muted-foreground"}`}>
                  {row.deltaDays != null ? formatDelta(row.deltaDays) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {groupsByKey.size} groups, {singleRows.length} standalone — {behind} behind, {onPace} on pace, {ahead} ahead
      </p>
    </div>
  );
}
