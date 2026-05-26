"use client";

import { useSelector } from "react-redux";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function Layer4EntriesPanel() {
  const entries = useSelector(loadoutReportSelect.entries);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold text-foreground">Layer 4 — Report Entries</h3>
      <p className="text-foreground/60 text-xs">
        <code>loadoutReportSelect.entries</code> — {entries.length} entry(ies).
        Each entry = one finished loadout matched against completed services.
      </p>
      {entries.length === 0 ? (
        <p className="text-foreground/40 text-xs italic">No entries. Check Layer 2 (loadouts) and Layer 3 (services).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-foreground/10 rounded">
            <thead>
              <tr className="text-foreground/50 border-b border-foreground/10 text-left">
                <th className="py-1 px-2 font-medium">Employee</th>
                <th className="py-1 px-2 font-medium">routeDate</th>
                <th className="py-1 px-2 font-medium text-right">Completed</th>
                <th className="py-1 px-2 font-medium text-right">Equip Masters</th>
                <th className="py-1 px-2 font-medium text-right">Other Masters</th>
                <th className="py-1 px-2 font-medium text-right">Unmatched</th>
                <th className="py-1 px-2 font-medium text-right">Pass</th>
                <th className="py-1 px-2 font-medium text-right">Fail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const name = employeeMap.get(entry.employeeId)?.name ?? entry.employeeId;
                let pass = 0;
                let fail = 0;
                for (const service of entry.completedServices) {
                  const r = service.x.productRuleCompliance;
                  if (r === "pass") pass++;
                  else if (r === "fail") fail++;
                }
                return (
                  <tr
                    key={`${entry.employeeId}:${entry.routeDate}`}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="py-1 px-2">{name}</td>
                    <td className="py-1 px-2 tabular-nums">{entry.routeDate}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{entry.completedServices.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{entry.actuals.equipmentMasters.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{entry.actuals.otherMasters.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{entry.actuals.unmatchedServices.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums text-accent">{pass}</td>
                    <td className="py-1 px-2 text-right tabular-nums text-destructive">{fail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
