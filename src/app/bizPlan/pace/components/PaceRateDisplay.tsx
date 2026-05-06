"use client";

import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Number } from "@/components/Number";
import { LandPlot } from "lucide-react";

type PaceRateDisplayProps = {
  unfinishedRate: CountSizePrice;
};

export function PaceRateDisplay({ unfinishedRate }: PaceRateDisplayProps) {
  return (
    <div className="rounded-md bg-accent/10 px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
        Required daily pace
      </p>
      <div className="grid grid-cols-4 gap-2">
        <RateCell icon={<span className="text-xs font-bold">#</span>}>
          <Number decimals={0}>{unfinishedRate.count}</Number>
        </RateCell>
        <RateCell icon={<LandPlot className="w-3.5 h-3.5" />}>
          <Number decimals={0}>{unfinishedRate.size}</Number>
        </RateCell>
        <RateCell icon={<span className="text-xs">Price</span>}>
          <Number isMoney decimals={0}>{unfinishedRate.price}</Number>
        </RateCell>
        <RateCell icon={<span className="text-xs">Rev</span>}>
          <Number isMoney decimals={0}>{unfinishedRate.rev}</Number>
        </RateCell>
      </div>
    </div>
  );
}

function RateCell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-muted-foreground flex items-center">{icon}</span>
      <span className="text-base font-mono font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}
