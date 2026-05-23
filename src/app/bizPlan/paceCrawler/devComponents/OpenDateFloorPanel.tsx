"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";

export function OpenDateFloorPanel() {
  const openDateFloorMap = useSelector(paceCrawlerSelect.servCodeOpenDateFloor);
  const programTypeMap = useSelector(paceCrawlerSelect.servCodeProgramTypeMap);
  const progCodes = useSelector(progServSelect.progCodes);
  const today = useSelector(paceCrawlerSelect.mainDate);

  const rows = progCodes.flatMap((progCode) =>
    progCode.servCodes
      .filter((sc) => openDateFloorMap.has(sc.servCodeId))
      .map((sc) => ({
        servCodeId: sc.servCodeId,
        progCodeId: progCode.progCodeId,
        programType: programTypeMap.get(sc.servCodeId) ?? "—",
        openDateFloor: openDateFloorMap.get(sc.servCodeId)!,
        alwaysAsap: sc.alwaysAsap,
        runsInSequence: progCode.runsInSequence,
      })),
  ).sort((a, b) => a.openDateFloor.localeCompare(b.openDateFloor));

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Static open date floor per servCode — the earliest calendar date it is eligible to be worked.
        Sequential N+1 floors are resolved dynamically during the crawl (not shown here).
        Today: {today}
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ProgCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ProgramType</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Open Floor</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.servCodeId} className="hover:bg-accent/5">
              <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
              <td className="px-2 py-1 border border-border font-mono">{row.progCodeId}</td>
              <td className="px-2 py-1 border border-border text-muted-foreground">{row.programType}</td>
              <td className="px-2 py-1 border border-border font-mono">{row.openDateFloor}</td>
              <td className="px-2 py-1 border border-border text-muted-foreground text-[10px]">
                {row.alwaysAsap && <span className="mr-1 text-destructive">asap</span>}
                {row.runsInSequence && <span className="text-primary">seq</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">{rows.length} servCodes</p>
    </div>
  );
}
