"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { ChevronRight } from "lucide-react";

export function ActivePoolPanel() {
  const activePoolMap = useSelector(paceCrawlerSelect.activePoolPriceByServCode);
  const progCodes = useSelector(progServSelect.progCodes);
  const groups = useSelector(assignmentGroupSelect.groups);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build a set of servCodeIds that are members of any shared group
  const groupMemberIds = new Set<string>();
  for (const group of groups) {
    for (const id of group.servCodeIds) groupMemberIds.add(id);
  }

  // Build rows: groups first (with combined pool), then standalone singles
  type DisplayRow =
    | { kind: "group"; label: string; key: string; servCodeIds: string[]; combinedPool: number; progCodeId: string }
    | { kind: "member"; servCodeId: string; progCodeId: string; longName: string; price: number; groupKey: string }
    | { kind: "single"; servCodeId: string; progCodeId: string; longName: string; price: number };

  const servCodeMeta = new Map<string, { progCodeId: string; longName: string }>();
  for (const progCode of progCodes) {
    for (const sc of progCode.servCodes) {
      servCodeMeta.set(sc.servCodeId, { progCodeId: progCode.progCodeId, longName: sc.longName });
    }
  }

  const displayRows: DisplayRow[] = [];

  // Group rows (from shared AssignmentGroup definitions)
  for (const group of groups) {
    const combinedPool = group.servCodeIds.reduce((sum, id) => sum + (activePoolMap.get(id) ?? 0), 0);
    if (combinedPool <= 0) continue;

    const firstMeta = servCodeMeta.get(group.servCodeIds[0]);
    displayRows.push({
      kind: "group",
      label: group.label,
      key: group.groupId,
      servCodeIds: group.servCodeIds,
      combinedPool,
      progCodeId: firstMeta?.progCodeId ?? "—",
    });

    // Member rows (shown when expanded)
    if (expandedGroups.has(group.groupId)) {
      for (const servCodeId of group.servCodeIds) {
        const price = activePoolMap.get(servCodeId) ?? 0;
        const meta = servCodeMeta.get(servCodeId);
        displayRows.push({
          kind: "member",
          servCodeId,
          progCodeId: meta?.progCodeId ?? "—",
          longName: meta?.longName ?? servCodeId,
          price,
          groupKey: group.groupId,
        });
      }
    }
  }

  // Standalone single rows (not in any shared group)
  const singleRows = progCodes
    .flatMap((progCode) =>
      progCode.servCodes
        .filter((sc) => !groupMemberIds.has(sc.servCodeId))
        .map((sc) => ({
          kind: "single" as const,
          servCodeId: sc.servCodeId,
          progCodeId: progCode.progCodeId,
          longName: sc.longName,
          price: activePoolMap.get(sc.servCodeId) ?? 0,
        })),
    )
    .filter((row) => row.price > 0)
    .sort((a, b) => b.price - a.price);

  displayRows.push(...singleRows);

  const totalPrice = [...activePoolMap.values()].reduce((sum, p) => sum + p, 0);

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Unscheduled price pool per servCode — active + asap services only (excludes printed).
        Groups show combined pool. Click ▶ to expand members. ServCodes with $0 remaining are hidden.
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">Entry</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ProgCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Name</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">$ Remaining</th>
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
                  <td className="px-2 py-1 border border-border text-muted-foreground text-[10px]">
                    {row.servCodeIds.join(", ")}
                  </td>
                  <td className="px-2 py-1 border border-border text-right font-mono font-semibold text-primary">
                    ${Math.round(row.combinedPool).toLocaleString()}
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
                  <td className="px-2 py-1 border border-border text-muted-foreground truncate max-w-48">{row.longName}</td>
                  <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                    {row.price > 0 ? `$${Math.round(row.price).toLocaleString()}` : "—"}
                  </td>
                </tr>
              );
            }

            // single
            return (
              <tr key={`single:${row.servCodeId}`} className="hover:bg-accent/5">
                <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
                <td className="px-2 py-1 border border-border font-mono">{row.progCodeId}</td>
                <td className="px-2 py-1 border border-border text-muted-foreground truncate max-w-48">{row.longName}</td>
                <td className="px-2 py-1 border border-border text-right font-mono text-accent">
                  ${Math.round(row.price).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-accent/5">
            <td colSpan={3} className="px-2 py-1 border border-border text-right text-muted-foreground font-semibold">
              Total
            </td>
            <td className="px-2 py-1 border border-border text-right font-mono font-semibold text-accent">
              ${Math.round(totalPrice).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">
        {groups.length} groups, {singleRows.length} standalone servCodes with remaining work
      </p>
    </div>
  );
}
