"use client";

import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";

export default function BurndownPage() {
  const chartData = useSelector(burndownSelect.chartData);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Season Burndown</h2>
          <p className="text-sm text-muted-foreground">
            Remaining pool by day — stacked by assignment group.
          </p>
        </div>

        {/* Chart placeholder */}
        <div className="rounded-lg border border-border bg-card flex items-center justify-center h-96 text-muted-foreground text-sm">
          Chart coming soon — {chartData.days.length} days ·{" "}
          {chartData.velocityLine
            ? `velocity line: ${chartData.velocityLine.startDate} → ${chartData.velocityLine.endDate}`
            : "no velocity line (no deadline set)"}
        </div>

        {/* Season metadata summary */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>Main date: {chartData.mainDate}</div>
          {chartData.snowMelt && <div>Season start (snow melt): {chartData.snowMelt}</div>}
          {chartData.snowDeadline && <div>Season deadline (snow): {chartData.snowDeadline}</div>}
        </div>
      </div>
    </div>
  );
}
