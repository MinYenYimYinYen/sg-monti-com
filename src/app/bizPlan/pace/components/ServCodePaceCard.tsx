"use client";

import { ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { ServCodeHeader } from "@/app/bizPlan/pace/components/ServCodeHeader";
import { PaceRateDisplay } from "@/app/bizPlan/pace/components/PaceRateDisplay";
import { AssignmentEditor } from "@/app/bizPlan/pace/components/AssignmentEditor";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { LandPlot } from "lucide-react";

type ServCodePaceCardProps = {
  pace: ServCodePace;
};

export function ServCodePaceCard({ pace }: ServCodePaceCardProps) {
  const { paceDelta, paceDeltaPct, teamExpectedCSP, unfinishedRate } = pace;

  // Positive delta = team can exceed required pace (good)
  // Negative delta = team is under-capacity (bad)
  const isUnderCapacity = paceDelta.count < 0 || paceDelta.size < 0;
  const hasDeltaData = teamExpectedCSP.count > 0 || unfinishedRate.count > 0;

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 bg-card w-3xl">
      <ServCodeHeader pace={pace} />
      <PaceRateDisplay unfinishedRate={pace.unfinishedRate} />

      {/* Pace delta row */}
      {hasDeltaData && (
        <div
          className={cn(
            "rounded-md px-3 py-2 flex items-center justify-between gap-4",
            isUnderCapacity ? "bg-destructive/10" : "bg-accent/10",
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Team capacity vs. required
          </p>
          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <DeltaCell
              icon={<span className="text-xs font-bold">#</span>}
              delta={paceDelta.count}
              pct={paceDeltaPct?.count ?? null}
            />
            <DeltaCell
              icon={<LandPlot className="w-3.5 h-3.5" />}
              delta={paceDelta.size}
              pct={paceDeltaPct?.size ?? null}
            />
          </div>
        </div>
      )}

      <AssignmentEditor
        servCode={pace.servCode}
        employeeShares={pace.employeeShares}
      />
    </div>
  );
}

function DeltaCell({
  icon,
  delta,
  pct,
}: {
  icon: React.ReactNode;
  delta: number;
  pct: number | null;
}) {
  const isNegative = delta < 0;
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-muted-foreground flex items-center">{icon}</span>
      <span
        className={cn(
          "font-medium",
          isNegative ? "text-destructive" : "text-accent",
        )}
      >
        <Number decimals={0} signDisplay="always">
          {delta}
        </Number>
      </span>
      {pct !== null && (
        <span
          className={cn(
            "text-[10px]",
            isNegative ? "text-destructive/70" : "text-accent/70",
          )}
        >
          <Number decimals={0} signDisplay="always">
            {pct * 100}
          </Number>
          %
        </span>
      )}
    </div>
  );
}
