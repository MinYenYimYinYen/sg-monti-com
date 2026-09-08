import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";

type ServiceIncreaseRowProps = {
  result: ServiceIncreaseResult;
};

export function ServiceIncreaseRow({ result }: ServiceIncreaseRowProps) {
  const { service, acqPrice, planPrice, planDiff, planDiffPercent, plannedPercent } = result;

  return (
    <div className="grid grid-cols-6 gap-2 px-3 py-1.5 text-sm border-b border-border last:border-0">
      <span className="font-mono text-foreground/70">{service.servCode.servCodeId}</span>
      <span className="text-right text-foreground/60">${acqPrice.toFixed(2)}</span>
      <span className="text-right text-foreground/60">${service.nextPrice.toFixed(2)}</span>
      <span className="text-right text-foreground/60">${planPrice.toFixed(2)}</span>
      <span className={`text-right font-medium ${planDiff > 0 ? "text-accent" : "text-destructive"}`}>
        {planDiff > 0 ? "+" : ""}{planDiff.toFixed(2)}
      </span>
      <span className="text-right text-foreground/70">
        {planDiffPercent.toFixed(1)}% <span className="text-foreground/40">({plannedPercent.toFixed(1)}% plan)</span>
      </span>
    </div>
  );
}
