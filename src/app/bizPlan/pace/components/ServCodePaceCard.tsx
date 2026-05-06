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
  const { teamAvgCapacity, unfinishedRate } = pace;

  // Show the section when either the team has capacity data or there's work remaining.
  // When unfinishedRate is zero (done), teamAvgCapacity shows surplus capacity.
  const hasCapacityData =
    teamAvgCapacity.count > 0 ||
    teamAvgCapacity.size > 0 ||
    teamAvgCapacity.price > 0 ||
    unfinishedRate.count > 0 ||
    unfinishedRate.size > 0 ||
    unfinishedRate.price > 0;

  // Team is behind if any dimension of avg capacity is less than required.
  // When unfinishedRate is zero, team is always "ahead" (surplus capacity).
  const isUnderCapacity =
    unfinishedRate.count > 0 && teamAvgCapacity.count < unfinishedRate.count ||
    unfinishedRate.size > 0 && teamAvgCapacity.size < unfinishedRate.size ||
    unfinishedRate.price > 0 && teamAvgCapacity.price < unfinishedRate.price;

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 bg-card w-3xl">
      <ServCodeHeader pace={pace} />
      <PaceRateDisplay unfinishedRate={pace.unfinishedRate} />

      {/* Team capacity vs. required — slash form: teamAvgCapacity / unfinishedRate */}
      {hasCapacityData && (
        <div
          className={cn(
            "rounded-md px-3 py-2 flex items-center justify-between gap-4",
            isUnderCapacity ? "bg-destructive/10" : "bg-accent/10",
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Team capacity vs. required
            <span className="ml-1 normal-case font-normal text-muted-foreground/60">
              Avg / Required
            </span>
          </p>
          <div className="flex items-center gap-4 text-sm font-mono shrink-0">
            <SlashCell
              icon={<span className="text-xs font-bold">#</span>}
              value={teamAvgCapacity.count}
              required={unfinishedRate.count}
              isUnder={isUnderCapacity}
            />
            <SlashCell
              icon={<LandPlot className="w-3.5 h-3.5" />}
              value={teamAvgCapacity.size}
              required={unfinishedRate.size}
              isUnder={isUnderCapacity}
            />
            <SlashCell
              icon={<span className="text-xs">$</span>}
              value={teamAvgCapacity.price}
              required={unfinishedRate.price}
              isUnder={isUnderCapacity}
              isMoney
            />
          </div>
        </div>
      )}

      <AssignmentEditor
        servCode={pace.servCode}
        employeeShares={pace.employeeShares}
        isUnderCapacity={isUnderCapacity}
      />
    </div>
  );
}

function SlashCell({
  icon,
  value,
  required,
  isUnder,
  isMoney = false,
}: {
  icon: React.ReactNode;
  value: number;
  required: number;
  isUnder: boolean;
  isMoney?: boolean;
}) {
  // When required is 0, team is ahead — show value in accent color
  const valueColor = isUnder ? "text-destructive" : "text-accent";

  return (
    <div className="flex flex-col items-center min-w-[3.5rem]">
      <span className="text-muted-foreground flex items-center">{icon}</span>
      <span className="flex items-center gap-0.5">
        <span className={cn("font-medium", valueColor)}>
          <Number decimals={0} isMoney={isMoney}>{value}</Number>
        </span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-muted-foreground">
          <Number decimals={0} isMoney={isMoney}>{required}</Number>
        </span>
      </span>
    </div>
  );
}
