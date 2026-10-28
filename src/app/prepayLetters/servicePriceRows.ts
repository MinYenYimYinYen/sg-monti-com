import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { getPrepayPrograms } from "@/app/prepayLetters/installmentSegregation";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.
//
// The current price table lists one row per service. A customer who already has
// everything we offer would overflow the box, so past a threshold the rows roll
// up to one per program.

export type ServicePriceRow = {
  key: string;
  label: string;
  /** True when a discount applies, so the row shows a strikethrough and an asterisk. */
  hasDiscount: boolean;
  /** Price before discounts. */
  originalPrice: number;
  /** Price after discounts, before prepay discount and tax. */
  price: number;
};

type BuildProgramRollupLabelParams = {
  description: string;
  serviceCount: number;
};

/** e.g. "Lawn Care Program (3 services)" — tells the customer what the rolled-up price covers. */
export function buildProgramRollupLabel({
  description,
  serviceCount,
}: BuildProgramRollupLabelParams): string {
  const noun = serviceCount === 1 ? "service" : "services";
  return `${description} (${serviceCount} ${noun})`;
}

type BuildServicePriceRowsParams = {
  customer: Customer;
  /** Roll up to program rows when the service count is greater than this. */
  thresholdForProgramRollup: number;
};

/**
 * Rows for the current price table, over non-installment programs only.
 * Per-service rows, or per-program rows when the service count exceeds the
 * threshold. Program row prices are sums, so they add up to the totals' service amount.
 */
export function buildServicePriceRows({
  customer,
  thresholdForProgramRollup,
}: BuildServicePriceRowsParams): ServicePriceRow[] {
  const programs = getPrepayPrograms(customer);
  const serviceCount = programs.reduce(
    (count, program) => count + program.services.length,
    0,
  );

  if (serviceCount > thresholdForProgramRollup) {
    return programs.map((program) => ({
      key: `program-${program.progId}`,
      label: buildProgramRollupLabel({
        description: program.progCode.description,
        serviceCount: program.services.length,
      }),
      hasDiscount: program.services.some(
        (service) => service.x.applicableDiscounts.length > 0,
      ),
      originalPrice: program.services.reduce(
        (sum, service) => sum + service.price,
        0,
      ),
      price: program.x.getPriceAfterDiscounts("price"),
    }));
  }

  return programs.flatMap((program) =>
    program.services.map((service) => ({
      key: `service-${service.servId}`,
      label: service.servCode.name,
      hasDiscount: service.x.applicableDiscounts.length > 0,
      originalPrice: service.price,
      price: service.x.getPriceAfterDiscounts("price"),
    })),
  );
}
