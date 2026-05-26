"use client";

import { useSelector } from "react-redux";
import { loadoutSelect } from "@/app/loadout/loadoutSelect";

export function Layer2FinishedLoadoutsPanel() {
  const finishedLoadoutMap = useSelector(loadoutSelect.finishedLoadoutMap);
  const entries = Array.from(finishedLoadoutMap.entries());

  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold text-foreground">Layer 2 — Finished Loadouts</h3>
      <p className="text-foreground/60 text-xs">
        <code>loadoutSelect.finishedLoadoutMap</code> — {entries.length} finished loadout(s) in store.
      </p>
      {entries.length === 0 ? (
        <p className="text-foreground/40 text-xs italic">No finished loadouts in store.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-foreground/10 rounded">
            <thead>
              <tr className="text-foreground/50 border-b border-foreground/10 text-left">
                <th className="py-1 px-2 font-medium">Key</th>
                <th className="py-1 px-2 font-medium">employeeId</th>
                <th className="py-1 px-2 font-medium">routeDate</th>
                <th className="py-1 px-2 font-medium text-right">Masters</th>
                <th className="py-1 px-2 font-medium text-right">Equip Masters</th>
                <th className="py-1 px-2 font-medium text-right">Other Masters</th>
                <th className="py-1 px-2 font-medium text-right">Singles</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, loadout]) => {
                const equipMasters = loadout.masters.filter((m) => m.equipments.length > 0);
                const otherMasters = loadout.masters.filter((m) => m.equipments.length === 0);
                return (
                  <tr key={key} className="border-b border-foreground/5 last:border-0">
                    <td className="py-1 px-2 text-foreground/60 font-mono">{key}</td>
                    <td className="py-1 px-2">{loadout.employeeId}</td>
                    <td className="py-1 px-2 tabular-nums">{loadout.routeDate}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{loadout.masters.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{equipMasters.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{otherMasters.length}</td>
                    <td className="py-1 px-2 text-right tabular-nums">{loadout.singles.length}</td>
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
