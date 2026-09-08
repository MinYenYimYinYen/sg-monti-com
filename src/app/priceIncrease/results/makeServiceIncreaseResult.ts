import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { SeasonIncrease } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import {
  calcSeasonCount,
  calcPlannedIncreasePercent,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";
import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";

type MakeServiceIncreaseResultParams = {
  service: Service;
  /** ISO date string — the date the program was sold */
  dateSold: string;
  currentSeason: number;
  seasonIncreases: SeasonIncrease[];
  ongoingIncrease: number;
};

/**
 * Computes a ServiceIncreaseResult for a single service.
 *
 * Returns null when the service has no acquisition price (no price table
 * configured for its program), since there is no meaningful baseline to
 * compute an increase against.
 *
 * This is the single source of truth for how per-service increase results
 * are produced. Caps, upsell bonus, and flag resolution are NOT applied here —
 * those belong in the customer-level aggregation layer.
 */
export function makeServiceIncreaseResult({
  service,
  dateSold,
  currentSeason,
  seasonIncreases,
  ongoingIncrease,
}: MakeServiceIncreaseResultParams): ServiceIncreaseResult | null {
  const acqPrice = service.x.acquisitionPrice;
  if (acqPrice === null) return null;

  const seasonCount = calcSeasonCount({ dateSold, currentSeason });

  const plannedPercent = calcPlannedIncreasePercent({
    seasonCount,
    seasonIncreases,
    ongoingIncrease,
  });

  const planPrice = acqPrice * (1 + plannedPercent / 100);
  const planDiff = planPrice - service.nextPrice;
  const planDiffPercent = service.nextPrice !== 0
    ? (planDiff / service.nextPrice) * 100
    : 0;

  return {
    service,
    plannedPercent,
    acqPrice,
    planPrice,
    planDiff,
    planDiffPercent,
  };
}
