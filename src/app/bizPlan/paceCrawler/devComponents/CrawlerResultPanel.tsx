"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { ChevronRight } from "lucide-react";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function CrawlerResultPanel() {
  const crawlerResult = useSelector(paceCrawlerSelect.crawlerResult);
  const activePoolMap = useSelector(
    paceCrawlerSelect.activePoolPriceByServCode,
  );
  const progCodes = useSelector(progServSelect.progCodes);
  const today = useSelector(paceCrawlerSelect.mainDate);
  const assignmentsByEmployeeId = useSelector(
    assignmentPlanSelect.assignmentsByEmployeeId,
  );

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build group registry from assignment plans (keyed by sorted servCodeIds)
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

  // Build servCode metadata map
  const servCodeMeta = new Map<
    string,
    {
      progCodeId: string;
      runsInSequence: boolean;
      scMin: string; // ServCode Min — persisted dateRange.min from RealGreen
      scMax: string; // ServCode Max — persisted dateRange.max from RealGreen
      pool: number;
    }
  >();
  for (const progCode of progCodes) {
    for (const sc of progCode.servCodes) {
      servCodeMeta.set(sc.servCodeId, {
        progCodeId: progCode.progCodeId,
        runsInSequence: progCode.runsInSequence,
        scMin: sc.alwaysAsap ? today : (sc.dateRange.min ?? ""),
        scMax: sc.alwaysAsap ? today : (sc.dateRange.max ?? ""),
        pool: activePoolMap.get(sc.servCodeId) ?? 0,
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
        scMin: string; // earliest member SC Min
        optMin: string; // Optimized Min (from crawl)
        optMax: string; // Optimized Max (from crawl)
        scMax: string; // latest member SC Max
        combinedPool: number;
        endColor: string;
      }
    | {
        kind: "member";
        servCodeId: string;
        progCodeId: string;
        projectedEnd: string | null;
        optMin: string;
        optMax: string;
        scMax: string;
        pool: number;
        endColor: string;
        groupKey: string;
      }
    | {
        kind: "single";
        servCodeId: string;
        progCodeId: string;
        runsInSequence: boolean;
        projectedEnd: string | null;
        scMin: string;
        optMin: string;
        optMax: string;
        scMax: string;
        pool: number;
        endColor: string;
        hasWork: boolean;
      };

  const displayRows: DisplayRow[] = [];

  // Group rows
  for (const group of groupsByKey.values()) {
    const combinedPool = group.servCodeIds.reduce(
      (sum, id) => sum + (activePoolMap.get(id) ?? 0),
      0,
    );
    const firstMeta = servCodeMeta.get(group.servCodeIds[0]);

    const memberEndDates = group.servCodeIds
      .map((id) => crawlerResult.byServCode.get(id)?.projectedEndDate)
      .filter((d): d is string => d != null);
    const projectedEnd =
      memberEndDates.length > 0 ? [...memberEndDates].sort().at(-1)! : null;

    const memberOptMins = group.servCodeIds
      .map((id) => crawlerResult.byServCode.get(id)?.optimizedMin)
      .filter((d): d is string => d != null);
    const optMin =
      memberOptMins.length > 0 ? [...memberOptMins].sort()[0] : "—";

    const memberOptMaxes = group.servCodeIds
      .map((id) => crawlerResult.byServCode.get(id)?.optimizedMax)
      .filter((d): d is string => d != null);
    const optMax =
      memberOptMaxes.length > 0 ? [...memberOptMaxes].sort().at(-1)! : "—";

    // SC Min = earliest member dateRange.min
    const memberScMins = group.servCodeIds
      .map((id) => servCodeMeta.get(id)?.scMin)
      .filter((d): d is string => d != null && d !== "");
    const scMin = memberScMins.length > 0 ? [...memberScMins].sort()[0] : "";

    const scMax = firstMeta?.scMax ?? "";
    let endColor = "text-muted-foreground";
    if (projectedEnd && scMax) {
      endColor = projectedEnd <= scMax ? "text-accent" : "text-destructive";
    }

    displayRows.push({
      kind: "group",
      label: group.label,
      key: group.key,
      servCodeIds: group.servCodeIds,
      progCodeId: firstMeta?.progCodeId ?? "—",
      projectedEnd,
      scMin,
      optMin,
      optMax,
      scMax,
      combinedPool,
      endColor,
    });

    if (expandedGroups.has(group.key)) {
      for (const servCodeId of group.servCodeIds) {
        const result = crawlerResult.byServCode.get(servCodeId);
        const meta = servCodeMeta.get(servCodeId);
        const memberEnd = result?.projectedEndDate ?? null;
        const memberScMax = meta?.scMax ?? "";
        let memberEndColor = "text-muted-foreground";
        if (memberEnd && memberScMax) {
          memberEndColor =
            memberEnd <= memberScMax ? "text-accent" : "text-destructive";
        }
        displayRows.push({
          kind: "member",
          servCodeId,
          progCodeId: meta?.progCodeId ?? "—",
          projectedEnd: memberEnd,
          optMin: result?.optimizedMin ?? "—",
          optMax: result?.optimizedMax ?? "—",
          scMax: memberScMax,
          pool: meta?.pool ?? 0,
          endColor: memberEndColor,
          groupKey: group.key,
        });
      }
    }
  }

  // Standalone single rows
  const singleRows = progCodes
    .flatMap((progCode) =>
      progCode.servCodes
        .filter((sc) => !groupMemberIds.has(sc.servCodeId))

        .map((sc) => {
          const result = crawlerResult.byServCode.get(sc.servCodeId);
          const pool = activePoolMap.get(sc.servCodeId) ?? 0;
          const scMin = sc.alwaysAsap ? today : (sc.dateRange.min ?? "");
          const scMax = sc.alwaysAsap ? today : (sc.dateRange.max ?? "");
          const projectedEnd = result?.projectedEndDate ?? null;
          const optMax = result?.optimizedMax ?? scMax;

          let endColor = "text-muted-foreground";
          if (projectedEnd && scMax) {
            endColor =
              projectedEnd <= scMax ? "text-accent" : "text-destructive";
          }

          return {
            kind: "single" as const,
            servCodeId: sc.servCodeId,
            progCodeId: progCode.progCodeId,
            runsInSequence: progCode.runsInSequence,
            projectedEnd,
            scMin,
            optMin: result?.optimizedMin ?? "—",
            optMax,
            scMax,
            pool,
            endColor,
            hasWork: pool > 0,
          };
        }),
    )
    .sort((a, b) => {
      const minCompare = (a.optMin ?? "").localeCompare(b.optMin ?? "");
      return minCompare !== 0
        ? minCompare
        : a.servCodeId.localeCompare(b.servCodeId);
    });

  displayRows.push(...singleRows);

  const withProjection = [...crawlerResult.byServCode.values()].filter(
    (r) => r.projectedEndDate !== null,
  ).length;
  const withWork = [...activePoolMap.values()].filter((p) => p > 0).length;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-muted-foreground shrink-0">
        Day-crawl result.{" "}
        <strong className="text-foreground">SC Min/Max</strong> = current
        RealGreen dateRange.
        <strong className="text-foreground ml-1">Opt Min/Max</strong> =
        optimizer proposal.
        <strong className="text-foreground ml-1">Proj End</strong> = raw drain
        date (before padding). Groups show combined result. Click ▶ to expand
        members. Green = finishes before SC Max. Red = behind. Today: {today}
      </p>

      <div className="overflow-auto flex-1">
        <table className="text-xs border-separate border-spacing-0 w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">
                Entry
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                Prog
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                SC Min
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                Proj End
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                Opt Min
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                Opt Max
              </th>
              <th className="text-left px-2 py-1 border border-border font-semibold">
                SC Max
              </th>
              <th className="text-right px-2 py-1 border border-border font-semibold">
                $ Pool
              </th>
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
                        <span className="text-primary font-semibold">
                          {row.label}
                        </span>
                        <span className="text-[9px] text-primary bg-primary/10 rounded px-1 ml-1">
                          group
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {row.progCodeId}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {formatDate(row.scMin)}
                    </td>
                    <td
                      className={`px-2 py-1 border border-border font-mono font-semibold ${row.endColor}`}
                    >
                      {formatDate(row.projectedEnd)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono">
                      {formatDate(row.optMin)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono">
                      {formatDate(row.optMax)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {formatDate(row.scMax)}
                    </td>
                    <td className="px-2 py-1 border border-border text-right font-mono text-primary font-semibold">
                      {row.combinedPool > 0
                        ? `$${Math.round(row.combinedPool).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                );
              }

              if (row.kind === "member") {
                return (
                  <tr
                    key={`member:${row.servCodeId}:${idx}`}
                    className="bg-primary/3 hover:bg-primary/5"
                  >
                    <td className="px-2 py-1 border border-border font-mono pl-6 text-muted-foreground">
                      ↳ {row.servCodeId}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {row.progCodeId}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      —
                    </td>
                    <td
                      className={`px-2 py-1 border border-border font-mono ${row.endColor}`}
                    >
                      {formatDate(row.projectedEnd)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {formatDate(row.optMin)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {formatDate(row.optMax)}
                    </td>
                    <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                      {formatDate(row.scMax)}
                    </td>
                    <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                      {row.pool > 0
                        ? `$${Math.round(row.pool).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                );
              }

              // single
              return (
                <tr
                  key={`single:${row.servCodeId}`}
                  className={row.hasWork ? "hover:bg-accent/5" : "opacity-40"}
                >
                  <td className="px-2 py-1 border border-border font-mono">
                    {row.servCodeId}
                    {row.runsInSequence && (
                      <span className="ml-1 text-[9px] text-primary">seq</span>
                    )}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                    {row.progCodeId}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                    {formatDate(row.scMin)}
                  </td>
                  <td
                    className={`px-2 py-1 border border-border font-mono font-semibold ${row.endColor}`}
                  >
                    {formatDate(row.projectedEnd)}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono">
                    {formatDate(row.optMin)}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono">
                    {formatDate(row.optMax)}
                  </td>
                  <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                    {formatDate(row.scMax)}
                  </td>
                  <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                    {row.pool > 0
                      ? `$${Math.round(row.pool).toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        {groupsByKey.size} groups, {singleRows.length} standalone servCodes —{" "}
        {withWork} with work, {withProjection} projected
      </p>
    </div>
  );
}
