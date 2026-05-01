"use client";

import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Number } from "@/components/Number";

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
        <RateCell label="Count">
          <Number decimals={0}>{unfinishedRate.count}</Number>
        </RateCell>
        <RateCell label="Size">
          <Number decimals={0}>{unfinishedRate.size}</Number>
        </RateCell>
        <RateCell label="Price">
          <Number isMoney decimals={0}>{unfinishedRate.price}</Number>
        </RateCell>
        <RateCell label="Rev">
          <Number isMoney decimals={0}>{unfinishedRate.rev}</Number>
        </RateCell>
      </div>
    </div>
  );
}

function RateCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}
