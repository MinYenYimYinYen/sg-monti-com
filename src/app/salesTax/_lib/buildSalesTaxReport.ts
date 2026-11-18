import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { calculateTax } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { RealGreenTaxReport, RealGreenTaxSummary } from "@/app/salesTax/salesTaxTypes";

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

export const toCents = (amount: number) => Math.round(amount * 100);

export type ServiceAmountsCents = {
  priceCents: number;
  discountCents: number;
  ppyDiscCents: number;
  netCents: number;
};

/** What one completed service contributes to any tax summary, in integer cents. */
export function getServiceAmountsCents(service: Service): ServiceAmountsCents {
  const priceCents = toCents(service.price);
  return {
    priceCents,
    discountCents: priceCents - toCents(service.x.getPriceAfterDiscounts("price")),
    ppyDiscCents: toCents(service.prepayDiscAmt ?? 0),
    netCents: toCents(service.x.priceAfterAllDiscounts),
  };
}

/** Integer cents, so repeated additions do not drift. */
type RunningCents = {
  services: Service[];
  priceCents: number;
  discountCents: number;
  ppyDiscCents: number;
  netCents: number;
  taxCents: number;
};

const emptyRunning = (): RunningCents => ({
  services: [],
  priceCents: 0,
  discountCents: 0,
  ppyDiscCents: 0,
  netCents: 0,
  taxCents: 0,
});

function toSummary(running: RunningCents): RealGreenTaxSummary {
  return {
    services: running.services,
    price: running.priceCents / 100,
    discountAmt: running.discountCents / 100,
    ppyDiscAmt: running.ppyDiscCents / 100,
    netAfterAllDiscounts: running.netCents / 100,
    taxAmount: running.taxCents / 100,
  };
}

/**
 * Sales and tax for completed services in `dateRange`, per tax code and in total.
 *
 * Tax is computed, not read from the CRM's recorded tax slots: each tax code on the customer is
 * applied to the service's net after all discounts. `calculateTax` is called once per code so each
 * code rounds separately, as the pricing code does. It rounds up when the service had no discount
 * and to nearest when it had a service, program or prepay discount.
 *
 * Which code is in which customer slot does not matter here: only `customer.taxCodes` is read. A
 * `baseTaxCode` row (id `|null|`) means a customer's tax id could not be resolved, most likely
 * because `useTaxCode` was not called.
 */
export function buildSalesTaxReport({
  services,
  dateRange,
}: {
  services: Service[];
  dateRange: TRange<string>;
}): RealGreenTaxReport {
  const runningByTaxCodeId = new Map<string, RunningCents>();
  const total = emptyRunning();
  const untaxed = emptyRunning();

  for (const service of services) {
    if (!isCompletedInRange({ service, dateRange })) continue;

    const { priceCents, discountCents, ppyDiscCents, netCents } = getServiceAmountsCents(service);
    const net = netCents / 100;
    const hasDiscount = discountCents > 0 || ppyDiscCents > 0;

    const addTo = ({ running, taxCents }: { running: RunningCents; taxCents: number }) => {
      running.services.push(service);
      running.priceCents += priceCents;
      running.discountCents += discountCents;
      running.ppyDiscCents += ppyDiscCents;
      running.netCents += netCents;
      running.taxCents += taxCents;
    };

    const { taxCodes } = service.program.customer;
    let serviceTaxCents = 0;
    for (const taxCode of taxCodes) {
      const taxCents = toCents(calculateTax({ price: net, taxRates: [taxCode.taxRate], hasDiscount }));
      serviceTaxCents += taxCents;
      const running = runningByTaxCodeId.get(taxCode.taxCodeId) ?? emptyRunning();
      addTo({ running, taxCents });
      runningByTaxCodeId.set(taxCode.taxCodeId, running);
    }

    addTo({ running: total, taxCents: serviceTaxCents });
    if (taxCodes.length === 0) addTo({ running: untaxed, taxCents: 0 });
  }

  const byTaxCodeId = new Map<string, RealGreenTaxSummary>();
  for (const [taxCodeId, running] of runningByTaxCodeId) {
    byTaxCodeId.set(taxCodeId, toSummary(running));
  }
  return { byTaxCodeId, total: toSummary(total), untaxed: toSummary(untaxed) };
}
