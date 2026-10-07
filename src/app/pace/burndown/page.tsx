"use client";

import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";
import { BurndownChart } from "@/app/pace/burndown/_components/BurndownChart";

export default function BurndownPage() {
  const rechartsData = useSelector(burndownSelect.rechartsData);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Season Burndown</h2>
          <p className="text-sm text-muted-foreground">
            Remaining pool by day — stacked by assignment group.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <BurndownChart data={rechartsData} />
        </div>

        {/* Season metadata summary */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>Main date: {rechartsData.mainDate}</div>
          {rechartsData.snowMelt && <div>Season start (snow melt): {rechartsData.snowMelt}</div>}
          {rechartsData.snowDeadline && <div>Season deadline (snow): {rechartsData.snowDeadline}</div>}
        </div>
      </div>
    </div>
  );
}
