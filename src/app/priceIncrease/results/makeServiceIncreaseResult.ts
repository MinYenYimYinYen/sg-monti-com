import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { SeasonIncrease } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import {
  calcSeasonCount,
  calcPlannedIncreasePercent,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";
import { ServiceIncreaseOutcome } from "@/app/priceIncrease/results/increaseResultsTypes";

type MakeServiceIncreaseResultParams = {
  service: Service;
  /** ISO date string — the date the program was sold */
  dateSold: string;
  currentSeason: number;
  seasonIncreases: SeasonIncrease[];
  ongoingIncrease: number;
};

/**
 * Computes a ServiceIncreaseOutcome for a single service.
 *
 * Returns `{ ok: false, issue }` (rather than null) when required data is
 * missing, so callers can surface the specific problem to the user:
 *   - "acqPrice": no price table configured for this program
 *   - "dateSold":  program sold date is empty or invalid
 *
 * Returns `{ ok: true, result }` on success.
 *
 * Caps, upsell bonus, and flag resolution are NOT applied here —
 * those belong in the customer-level aggregation layer.
 */
export function makeServiceIncreaseResult({
  service,
  dateSold,
  currentSeason,
  seasonIncreases,
  ongoingIncrease,
}: MakeServiceIncreaseResultParams): ServiceIncreaseOutcome {
  const custId = service.program.customer.custId;
  const progId = service.program.progId;
  const servId = service.servId;
  const servCodeId = service.servCode.servCodeId;
  const progCodeId = service.program.progCode.progCodeId;

  // dateSold is a program-level field — callers should guard this before the
  // service loop and emit one issue per program. This guard is a safety net
  // for direct callers that don't pre-check.
  if (!dateSold) {
    return {
      ok: false,
      issue: {
        custId,
        progId,
        missingField: "dateSold",
        message: `Customer ${custId}, program ${progCodeId}: sold date is missing.`,
      },
    };
  }

  const acqPrice = service.x.acquisitionPrice;
  if (acqPrice === null) {
    return {
      ok: false,
      issue: {
        custId,
        progId,
        servId,
        missingField: "acqPrice",
        message: `Customer ${custId}, service ${servCodeId}: no price table configured — acquisition price unavailable.`,
      },
    };
  }

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
    ok: true,
    result: {
      customer: service.program.customer,
      service,
      plannedPercent,
      acqPrice,
      planPrice,
      planDiff,
      planDiffPercent,
    },
  };
}
