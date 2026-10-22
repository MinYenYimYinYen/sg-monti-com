import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import {
  applyDiscounts,
  calculatePrepayDiscAmt,
  calculatePrepayServTotal,
} from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
  type PrepayTotals,
} from "@/app/prepayLetters/installmentSegregation";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.
//
// The upsell is a proposed program, not a CRM record, so the Program/Service Utils
// classes cannot price it. It is priced here straight from the ProgCode price chart,
// using the same pricing pipeline (`calculatePrepayServTotal`) the Utils classes use,
// so the upsell rounds exactly like every other service on the letter.
//
// The customer's discount is the default discount for a proposed program, so it is
// applied here at render time rather than being expected from the caller.

export type PricedUpsellService = {
  servCodeId: string;
  name: string;
  price: number;
  priceAfterDiscounts: number;
  hasDiscount: boolean;
};

export type PricedUpsell = {
  description: string;
  services: PricedUpsellService[];
  totals: PrepayTotals;
};

type PriceUpsellParams = {
  progCode: ProgCode;
  customer: Customer;
  /** Prepay discount percentage (e.g. `10` for 10%). */
  prepayPercent: number;
};

/**
 * Prices a proposed program for a customer, one service per ServCode.
 *
 * Returns null when the upsell cannot be priced or should not be priced: an
 * installment program (never priced on the letter), a program with no services,
 * or a program whose price chart has no price for the customer's size.
 */
export function priceUpsell({
  progCode,
  customer,
  prepayPercent,
}: PriceUpsellParams): PricedUpsell | null {
  if (progCode.isInstallment || progCode.servCodes.length === 0) return null;

  const price = progCode.x.getServPrice(customer.size);
  if (price === null) return null;

  const discounts = customer.discount ? [customer.discount] : [];
  const hasDiscount = discounts.length > 0;
  const priceAfterDiscounts = applyDiscounts({ price, discounts });
  const prepayDisc = calculatePrepayDiscAmt({
    servPrice: priceAfterDiscounts,
    prepayPercent,
  });
  const afterPrepay = priceAfterDiscounts - prepayDisc;
  const total = calculatePrepayServTotal({
    price,
    discounts,
    prepayPercent,
    taxRate: customer.taxRate,
  });
  const tax = total - afterPrepay;

  const services = progCode.servCodes.map((servCode) => ({
    servCodeId: servCode.servCodeId,
    name: servCode.name,
    price,
    priceAfterDiscounts,
    hasDiscount,
  }));

  // Every service has the same price, and rounding happens per service above,
  // so multiplying by the count matches summing per-service results.
  const serviceCount = services.length;
  return {
    description: progCode.description,
    services,
    totals: {
      serviceAmt: priceAfterDiscounts * serviceCount,
      prepayDisc: prepayDisc * serviceCount,
      afterPrepay: afterPrepay * serviceCount,
      tax: tax * serviceCount,
      total: total * serviceCount,
    },
  };
}

type AddPrepayTotalsParams = {
  first: PrepayTotals;
  second: PrepayTotals;
};

export function addPrepayTotals({
  first,
  second,
}: AddPrepayTotalsParams): PrepayTotals {
  return {
    serviceAmt: first.serviceAmt + second.serviceAmt,
    prepayDisc: first.prepayDisc + second.prepayDisc,
    afterPrepay: first.afterPrepay + second.afterPrepay,
    tax: first.tax + second.tax,
    total: first.total + second.total,
  };
}

export type UpsellLetterPricing = {
  upsell: PricedUpsell;
  /** The customer's current prepay programs, at the upsell prepay percent. */
  currentTotals: PrepayTotals;
  /** Current prepay programs plus the upsell, at the upsell prepay percent. */
  combinedTotals: PrepayTotals;
};

type GetUpsellLetterPricingParams = {
  customer: Customer;
  upsell: ProgCode | null;
  /** The upsell prepay percentage, applied to every current and proposed service. */
  prepayPercent: number;
};

/**
 * Everything the upsell slots need. Null when there is no upsell or it cannot be
 * priced — every upsell slot renders nothing in that case.
 */
export function getUpsellLetterPricing({
  customer,
  upsell,
  prepayPercent,
}: GetUpsellLetterPricingParams): UpsellLetterPricing | null {
  if (upsell === null) return null;

  const pricedUpsell = priceUpsell({
    progCode: upsell,
    customer,
    prepayPercent,
  });
  if (pricedUpsell === null) return null;

  const currentTotals = calculatePrepayTotals({
    programs: getPrepayPrograms(customer),
    prepayPercent,
  });

  return {
    upsell: pricedUpsell,
    currentTotals,
    combinedTotals: addPrepayTotals({
      first: currentTotals,
      second: pricedUpsell.totals,
    }),
  };
}
