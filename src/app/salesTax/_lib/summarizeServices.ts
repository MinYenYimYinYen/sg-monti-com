import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { getServiceAmountsCents } from "@/app/salesTax/_lib/buildSalesTaxReport";
import { RealGreenTaxSummary } from "@/app/salesTax/salesTaxTypes";

/**
 * Sums a set of services. Tax is the net after all discounts times `ratePercent`, the state's
 * method, so it is not RealGreen's per-service rounded amount. Pass 0 for sales that carry no tax.
 */
export function summarizeServices({
  services,
  ratePercent,
}: {
  services: Service[];
  ratePercent: number;
}): RealGreenTaxSummary {
  let priceCents = 0;
  let discountCents = 0;
  let ppyDiscCents = 0;
  let netCents = 0;
  for (const service of services) {
    const amounts = getServiceAmountsCents(service);
    priceCents += amounts.priceCents;
    discountCents += amounts.discountCents;
    ppyDiscCents += amounts.ppyDiscCents;
    netCents += amounts.netCents;
  }
  const taxCents = Math.round((netCents * ratePercent) / 100);
  return {
    services,
    price: priceCents / 100,
    discountAmt: discountCents / 100,
    ppyDiscAmt: ppyDiscCents / 100,
    netAfterAllDiscounts: netCents / 100,
    taxAmount: taxCents / 100,
  };
}
