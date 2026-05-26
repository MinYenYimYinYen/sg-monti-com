"use client";

import { useSelector } from "react-redux";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";

export function Layer1DateRangePanel() {
  const dateRange = useSelector(loadoutReportSelect.dateRange);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold text-foreground">Layer 1 — Date Range</h3>
      <p className="text-foreground/60 text-xs">
        Current value of <code>loadoutReportSelect.dateRange</code> from Redux state.
      </p>
      <table className="w-full text-xs border border-foreground/10 rounded">
        <thead>
          <tr className="text-foreground/50 border-b border-foreground/10 text-left">
            <th className="py-1 px-2 font-medium">Field</th>
            <th className="py-1 px-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-foreground/5">
            <td className="py-1 px-2 text-foreground/60">min</td>
            <td className="py-1 px-2 tabular-nums">{dateRange.min || <span className="text-foreground/30 italic">empty</span>}</td>
          </tr>
          <tr>
            <td className="py-1 px-2 text-foreground/60">max</td>
            <td className="py-1 px-2 tabular-nums">{dateRange.max || <span className="text-foreground/30 italic">empty</span>}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
