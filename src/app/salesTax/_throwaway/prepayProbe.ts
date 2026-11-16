// THROWAWAY: proves or disproves what the RealGreen API gives us for prepay discounts.
// Delete the whole _throwaway folder (and its page.tsx usage) once the numbers are confirmed.
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { isCompletedInRange } from "@/app/salesTax/_lib/revenueByTaxCodeId";

export type ServiceSample = {
  label: string;
  custId: number;
  servId: number;
  servCodeId: string;
  price: number;
  afterServiceAndProgramDiscounts: number;
  ppyDiscAmt: number | undefined;
  prepayId: number | null;
  priceAfterAllDiscounts: number;
  hasServiceOrProgramDiscount: boolean;
  taxCodes: { taxCodeId: string; taxRate: number }[];
};

export type PrepayProbe = {
  completedCount: number;
  /** ppyDiscAmt absent on the loaded doc: the mirror was not fully re-synced. */
  missingPpyDiscAmt: number;
  ppyZero: number;
  ppyPositive: number;
  withPrepayId: number;
  /** prepayId set but no discount amount: the API may not report the amount per service. */
  prepayIdButNoAmount: number;
  /** discount amount but no prepayId: the id may not be reported. */
  amountButNoPrepayId: number;
  /** ppyDiscAmt larger than the price left after service/program discounts: bad data. */
  amountExceedsPrice: number;
  samples: ServiceSample[];
};

function toSample({ label, service }: { label: string; service: Service }): ServiceSample {
  const customer = service.program.customer;
  return {
    label,
    custId: customer.custId,
    servId: service.servId,
    servCodeId: service.servCodeId,
    price: service.price,
    afterServiceAndProgramDiscounts: service.x.getPriceAfterDiscounts("price"),
    ppyDiscAmt: service.ppyDiscAmt,
    prepayId: service.prepayId,
    priceAfterAllDiscounts: service.x.priceAfterAllDiscounts,
    hasServiceOrProgramDiscount: service.x.applicableDiscounts.length > 0,
    taxCodes: customer.taxCodes.map((taxCode) => ({
      taxCodeId: taxCode.taxCodeId,
      taxRate: taxCode.taxRate,
    })),
  };
}

export function buildPrepayProbe({
  services,
  dateRange,
}: {
  services: Service[];
  dateRange: TRange<string>;
}): PrepayProbe {
  const completed = services.filter((service) => isCompletedInRange({ service, dateRange }));

  const probe: PrepayProbe = {
    completedCount: completed.length,
    missingPpyDiscAmt: 0,
    ppyZero: 0,
    ppyPositive: 0,
    withPrepayId: 0,
    prepayIdButNoAmount: 0,
    amountButNoPrepayId: 0,
    amountExceedsPrice: 0,
    samples: [],
  };

  // Samples are the first match of each kind, so the output stays tiny however many services load.
  const sampleFinders: { label: string; match: (service: Service) => boolean }[] = [
    { label: "ppyDiscAmt === 0", match: (s) => s.ppyDiscAmt === 0 },
    { label: "ppyDiscAmt > 0", match: (s) => s.ppyDiscAmt > 0 },
    {
      label: "ppyDiscAmt === 0, 2+ tax codes",
      match: (s) => s.ppyDiscAmt === 0 && s.program.customer.taxCodes.length >= 2,
    },
    {
      label: "ppyDiscAmt === 0, service/program discount",
      match: (s) => s.ppyDiscAmt === 0 && s.x.applicableDiscounts.length > 0,
    },
    {
      label: "prepayId set but ppyDiscAmt === 0",
      match: (s) => s.prepayId !== null && s.ppyDiscAmt === 0,
    },
  ];

  for (const service of completed) {
    const amount: unknown = service.ppyDiscAmt;
    if (typeof amount !== "number") {
      probe.missingPpyDiscAmt++;
      continue;
    }
    if (amount === 0) probe.ppyZero++;
    if (amount > 0) probe.ppyPositive++;
    if (service.prepayId !== null) probe.withPrepayId++;
    if (service.prepayId !== null && amount === 0) probe.prepayIdButNoAmount++;
    if (service.prepayId === null && amount > 0) probe.amountButNoPrepayId++;
    if (amount > service.x.getPriceAfterDiscounts("price")) probe.amountExceedsPrice++;
  }

  for (const { label, match } of sampleFinders) {
    const found = completed.find(
      (service) => typeof service.ppyDiscAmt === "number" && match(service),
    );
    if (found) probe.samples.push(toSample({ label, service: found }));
  }

  return probe;
}
