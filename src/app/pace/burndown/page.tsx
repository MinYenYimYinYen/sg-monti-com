"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { burndownSelect, computeSlopeAnalysis } from "@/app/pace/burndown/burndownSelect";
import { BurndownChart } from "@/app/pace/burndown/_components/BurndownChart";
import { GoalMultiplierSlider } from "@/app/pace/lib/_components/GoalMultiplierSlider";

// ---------------------------------------------------------------------------
// Dollar formatter for stats display
// ---------------------------------------------------------------------------

function formatDollars(value: number): string {
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// BurndownPage
// ---------------------------------------------------------------------------

export default function BurndownPage() {
  const [windowDays, setWindowDays] = useState(10);

  const rechartsData = useSelector(burndownSelect.rechartsData);
  const burndownDays = useSelector(burndownSelect.burndownDays);
  const velocityLine = useSelector(burndownSelect.velocityLine);

  const slopeAnalysis = computeSlopeAnalysis(
    burndownDays,
    velocityLine,
    rechartsData.mainDate,
    windowDays,
  );

  const isAhead = slopeAnalysis.variance >= 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Season Burndown</h2>
          <p className="text-sm text-muted-foreground">
            Remaining pool by day — stacked by assignment group.
          </p>
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <BurndownChart data={rechartsData} slopeLine={slopeAnalysis.slopeLine} />
        </div>

        {/* Slope analysis controls */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              {windowDays}-day slope analysis
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
          </div>

          {/* Stats */}
          {slopeAnalysis.slopeLine ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <div className="text-muted-foreground">Look-back window</div>
              <div className="text-foreground font-medium">
                {slopeAnalysis.windowStartDate} → {rechartsData.mainDate}
              </div>

              <div className="text-muted-foreground">Actual burn rate</div>
              <div className="text-foreground font-medium">
                {formatDollars(slopeAnalysis.actualDailyBurn)}/day
              </div>

              <div className="text-muted-foreground">Ideal burn rate</div>
              <div className="text-foreground font-medium">
                {formatDollars(slopeAnalysis.idealDailyBurn)}/day
              </div>

              <div className="text-muted-foreground">Variance</div>
              <div className={`font-medium ${isAhead ? "text-accent" : "text-destructive"}`}>
                {formatDollars(slopeAnalysis.variance)}/day ({formatPct(slopeAnalysis.variancePct)})
                {" "}
                {isAhead ? "▲ ahead of pace" : "▼ behind pace"}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not enough past data for a {windowDays}-day look-back.
            </p>
          )}
        </div>

        {/* Goal multiplier — what-if slider */}
        <div className="rounded-lg border border-border bg-card p-4">
          <GoalMultiplierSlider />
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
