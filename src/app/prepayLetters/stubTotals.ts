import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
  type PrepayTotals,
} from "@/app/prepayLetters/installmentSegregation";
import { getUpsellLetterPricing } from "@/app/prepayLetters/upsellPricing";
import {
  getBalanceAdjustment,
  getTotalDue,
} from "@/app/prepayLetters/balanceAdjustment";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.

export type TotalsSource = "current" | "upsell";

type GetStubTotalsParams = {
  customer: Customer;
  config: PrepayConfig;
  upsell: ProgCode | null;
  totalsSource: TotalsSource;
};

/**
 * The totals shown on the return stub: current services at the standard prepay
 * percent, or current plus upsell at the upsell prepay percent.
 *
 * Falls back to the current totals when "upsell" is requested but there is no
 * upsell, or it cannot be priced — the stub must always show a number.
 */
export function getStubTotals({
  customer,
  config,
  upsell,
  totalsSource,
}: GetStubTotalsParams): PrepayTotals {
  const totals = getUnadjustedStubTotals({
    customer,
    config,
    upsell,
    totalsSource,
  });
  const balances = getBalanceAdjustment({ customer, config });
  return { ...totals, total: getTotalDue({ total: totals.total, balances }) };
}

function getUnadjustedStubTotals({
  customer,
  config,
  upsell,
  totalsSource,
}: GetStubTotalsParams): PrepayTotals {
  if (totalsSource === "upsell") {
    const pricing = getUpsellLetterPricing({
      customer,
      upsell,
      prepayPercent: config.upsellPrepayDiscPercent,
    });
    if (pricing !== null) return pricing.combinedTotals;
  }

  return calculatePrepayTotals({
    programs: getPrepayPrograms(customer),
    prepayPercent: config.stdPrepayDiscPercent,
  });
}
