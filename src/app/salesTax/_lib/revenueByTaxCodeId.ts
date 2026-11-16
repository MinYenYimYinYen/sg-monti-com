import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { calculateTax } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import { TaxSummary } from "@/app/salesTax/salesTaxTypes";

const COMPLETED_STATUS = "S";

/** Completed services whose doneDate falls inside `dateRange` (inclusive, date part only). */
export function isCompletedInRange({
  service,
  dateRange,
}: {
  service: Service;
  dateRange: TRange<string>;
}): boolean {
  if (service.status !== COMPLETED_STATUS) return false;
  const doneDate = service.x.doneDate?.slice(0, 10);
  if (!doneDate) return false;
  return doneDate >= dateRange.min && doneDate <= dateRange.max;
}

/** True when the service has a discount that makes SA5 round (not ceil) the tax. */
function hasAnyDiscount(service: Service): boolean {
  return service.x.applicableDiscounts.length > 0 || service.ppyDiscAmt > 0;
}

/**
 * Sums revenue and tax per tax code using each customer's current tax codes. Amounts are kept in
 * integer cents so repeated additions do not drift. Services whose prepay discount has not been
 * synced yet (non-finite price) are skipped rather than poisoning the totals.
 */
export function revenueByTaxCodeId({
  services,
  dateRange,
}: {
  services: Service[];
  dateRange: TRange<string>;
}): Map<string, TaxSummary> {
  const centsByTaxCodeId = new Map<string, { revenueCents: number; taxCents: number }>();

  for (const service of services) {
    if (!isCompletedInRange({ service, dateRange })) continue;
    const revenue = service.x.priceAfterAllDiscounts;
    if (!Number.isFinite(revenue)) continue;

    const hasDiscount = hasAnyDiscount(service);
    for (const taxCode of service.program.customer.taxCodes) {
      const tax = calculateTax({ price: revenue, taxRates: [taxCode.taxRate], hasDiscount });
      const running = centsByTaxCodeId.get(taxCode.taxCodeId) ?? { revenueCents: 0, taxCents: 0 };
      running.revenueCents += Math.round(revenue * 100);
      running.taxCents += Math.round(tax * 100);
      centsByTaxCodeId.set(taxCode.taxCodeId, running);
    }
  }

  const summaries = new Map<string, TaxSummary>();
  for (const [taxCodeId, { revenueCents, taxCents }] of centsByTaxCodeId) {
    summaries.set(taxCodeId, { revenue: revenueCents / 100, taxAmount: taxCents / 100 });
  }
  return summaries;
}
