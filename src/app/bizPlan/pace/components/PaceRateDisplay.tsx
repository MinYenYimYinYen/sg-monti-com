"use client";

import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";

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
        <RateCell label="Count" value={unfinishedRate.count.toFixed(1)} />
        <RateCell label="Size" value={unfinishedRate.size.toFixed(1)} />
        <RateCell
          label="Price"
          value={`$${unfinishedRate.price.toFixed(0)}`}
        />
        <RateCell label="Rev" value={`$${unfinishedRate.rev.toFixed(0)}`} />
      </div>
    </div>
  );
}

function RateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
