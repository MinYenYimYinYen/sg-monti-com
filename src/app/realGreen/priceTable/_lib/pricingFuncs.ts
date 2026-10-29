import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { Discount, DiscountType } from "@/app/realGreen/discount/DiscountTypes";

// ---------------------------------------------------------------------------
// Price chart lookup
// ---------------------------------------------------------------------------

type GetPriceChartPriceParams = {
  size: number;
  priceTable: PriceTable;
};

/**
 * Derives a price from a price table for a given property size.
 *
 * Size is always ceiled to the nearest whole number before lookup — we do not
 * implement RealGreen's `interpolate` flag.
 *
 * Step-function: returns the rate of the first range whose upper bound (size)
 * is >= the ceiled service size.
 *
 * Overflow: if the ceiled size exceeds all range upper bounds, the overflow
 * formula is applied:
 *   price = (ceiledSize - priceTable.maxSize) * priceTable.maxPrice + lastRange.price
 * where `maxPrice` is the per-ksf rate above maxSize.
 *
 * Returns null if the price table has no ranges.
 */
export function getPriceChartPrice({ size, priceTable }: GetPriceChartPriceParams): number | null {
  const { ranges, maxSize, maxPrice } = priceTable;

  if (ranges.length === 0) return null;

  const ceiledSize = Math.ceil(size);

  // Step-function lookup: first range whose upper bound covers the size
  for (const range of ranges) {
    if (ceiledSize <= range.size) {
      return range.price;
    }
  }

  // Overflow: size exceeds all range upper bounds
  const lastRange = ranges[ranges.length - 1];
  return (ceiledSize - maxSize) * maxPrice + lastRange.price;
}

// ---------------------------------------------------------------------------
// Economy vs preferred table decision
// ---------------------------------------------------------------------------

type IsEconParams = {
  minForPreferred: number | null;
  activeServiceCount: number;
};

/**
 * Returns true if the economy price table should be used instead of the
 * preferred price table.
 *
 * Economy applies when:
 * - `minForPreferred` is set (non-null), AND
 * - the number of active services in the program is less than `minForPreferred`
 *
 * "Active" services are those with statuses from
 * getServiceStatuses(["active", "asap", "printed", "completed"]).
 * The caller is responsible for computing `activeServiceCount`.
 *
 * If `minForPreferred` is null, preferred pricing always applies.
 */
export function isEcon({ minForPreferred, activeServiceCount }: IsEconParams): boolean {
  if (minForPreferred === null) return false;
  return activeServiceCount < minForPreferred;
}

// ---------------------------------------------------------------------------
// Discount application
// ---------------------------------------------------------------------------

type ApplyDiscountParams = {
  price: number;
  discount: Discount;
};

/**
 * Applies a single discount to a price.
 *
 * - PERCENT (DiscountType.PERCENT = 1): discountAmt = round(price × (amount/100) × 100) / 100
 * - DOLLAR  (DiscountType.DOLLAR  = 2): discountAmt = amount
 *
 * Each discount is rounded individually before being applied — this matches
 * SA5 (RealGreen) behavior.
 *
 * If `isSurcharge` is true, the amount is added to the price instead of
 * subtracted. Non-surcharge discounts are capped at the price (no negatives).
 */
export function applyDiscount({ price, discount }: ApplyDiscountParams): number {
  const { discountType, amount, isSurcharge } = discount;

  let discountAmt: number;
  if (discountType === DiscountType.PERCENT) {
    discountAmt = Math.round(price * (amount / 100) * 100) / 100;
  } else {
    // DiscountType.DOLLAR
    discountAmt = amount;
  }

  if (isSurcharge) {
    return price + discountAmt;
  }

  // Cap: discount cannot exceed the price (no negative prices)
  const cappedAmt = Math.min(discountAmt, price);
  return price - cappedAmt;
}

type ApplyDiscountsParams = {
  price: number;
  discounts: Discount[];
};

/**
 * Applies multiple discounts to a price.
 *
 * Each discount is rounded individually (per SA5 behavior), then the amounts
 * are summed. The total non-surcharge discount is capped at the price.
 *
 * Surcharges are summed separately and added after the discount cap is applied.
 */
export function applyDiscounts({ price, discounts }: ApplyDiscountsParams): number {
  if (discounts.length === 0) return price;

  let totalDiscount = 0;
  let totalSurcharge = 0;

  for (const discount of discounts) {
    const { discountType, amount, isSurcharge } = discount;

    let amt: number;
    if (discountType === DiscountType.PERCENT) {
      amt = Math.round(price * (amount / 100) * 100) / 100;
    } else {
      amt = amount;
    }

    if (isSurcharge) {
      totalSurcharge += amt;
    } else {
      totalDiscount += amt;
    }
  }

  // Cap total discount at price (no negatives)
  const cappedDiscount = Math.min(totalDiscount, price);
  return price - cappedDiscount + totalSurcharge;
}

// ---------------------------------------------------------------------------
// Prepay discount (per service)
// ---------------------------------------------------------------------------

type CalculatePrepayDiscAmtParams = {
  servPrice: number;
  /** Prepay discount percentage (e.g. `5` for 5%). */
  prepayPercent: number;
};

/**
 * Calculates the prepay discount amount for a single service price.
 *
 * Rounded per-service to match SA5 behavior — callers multiply by servCount
 * to get the program total.
 *
 * An exact half-cent tie rounds DOWN (SA5: $82.50 × 3% = 2.475 → $2.47), i.e.
 * the customer keeps the half cent. Every non-tie value rounds to the nearest
 * cent as usual. Math is done in integer cents so the tie is detected exactly
 * instead of depending on float noise (82.5 * 0.03 * 100 is 247.5, but
 * 82.5 * 0.97 is 80.02499…).
 */
export function calculatePrepayDiscAmt({ servPrice, prepayPercent }: CalculatePrepayDiscAmtParams): number {
  const priceCents = Math.round(servPrice * 100);
  const discountCents = (priceCents * prepayPercent) / 100;
  // The epsilon keeps a tie that float math pushed slightly above .5 from rounding up.
  const roundedCents = Math.ceil(discountCents - 0.5 - 1e-9);
  // Math.ceil of a small negative returns -0; normalize so a zero discount is a plain 0.
  return (roundedCents === 0 ? 0 : roundedCents) / 100;
}

// ---------------------------------------------------------------------------
// Tax amount (per service, post-prepay)
// ---------------------------------------------------------------------------

type CalculateTaxAmtParams = {
  servPrice: number;
  /** Per-service prepay discount already calculated via `calculatePrepayDiscAmt`. */
  prepayDiscAmt: number;
  /** One rate per tax code, as percentages (e.g. `[6.875, 0.5]`). See `calculateTax`. */
  taxRates: number[];
};

/**
 * Calculates the tax amount for a single service after the prepay discount.
 *
 * Tax is applied to the post-prepay price (`servPrice - prepayDiscAmt`).
 * `hasDiscount` is `false` here because this function models theoretical
 * price-chart pricing where no service/program discounts exist yet.
 *
 * Rounded per-service — callers multiply by servCount for the program total.
 */
export function calculateTaxAmt({ servPrice, prepayDiscAmt, taxRates }: CalculateTaxAmtParams): number {
  const postPrepayPrice = servPrice - prepayDiscAmt;
  return calculateTax({ price: postPrepayPrice, taxRates, hasDiscount: false });
}

// ---------------------------------------------------------------------------
// Per-service net total
// ---------------------------------------------------------------------------

type CalculateServTotalParams = {
  servPrice: number;
  prepayDiscAmt: number;
  taxAmt: number;
};

/**
 * Calculates the net amount due for a single service.
 *
 * `(servPrice - prepayDiscAmt) + taxAmt`
 */
export function calculateServTotal({ servPrice, prepayDiscAmt, taxAmt }: CalculateServTotalParams): number {
  return (servPrice - prepayDiscAmt) + taxAmt;
}

// ---------------------------------------------------------------------------
// Tax calculation
// ---------------------------------------------------------------------------

type CalculateTaxParams = {
  price: number;
  /**
   * One rate per tax code on the customer, as percentages (e.g. `[6.875, 0.5]`).
   * Never pass a pre-summed rate: SA5 rounds each code separately (see below).
   */
  taxRates: number[];
  hasDiscount: boolean;
};

/**
 * Calculates the tax amount for a single service price.
 *
 * Tax is calculated per service — the caller sums results for a program total.
 *
 * SA5 rounds the tax of each tax code separately and then adds the rounded
 * amounts. Rounding the summed rate once is a penny off on some prices
 * (166.74 at 6.875% + 0.5%: 11.46 + 0.83 = 12.29, but at 7.375% it is 12.30).
 *
 * Each code's rounding is asymmetric (matches SA5/CRM behavior):
 * - If no discount was applied: ceil(rawTax × 100) / 100
 * - If a discount was applied: round(rawTax × 100) / 100
 * This rule was established on single-rate customers and has not been
 * confirmed per code for the no-discount case.
 *
 * Returns 0 when there are no tax codes (or every rate is 0).
 */
export function calculateTax({ price, taxRates, hasDiscount }: CalculateTaxParams): number {
  const totalCents = taxRates.reduce((sum, taxRate) => {
    if (taxRate === 0) return sum;

    const rawTax = price * (taxRate / 100);
    const codeCents = hasDiscount
      ? Math.round(rawTax * 100)
      : Math.ceil(rawTax * 100);
    return sum + codeCents;
  }, 0);

  return totalCents / 100;
}

// ---------------------------------------------------------------------------
// Prepay letter per-service total (full pipeline)
// ---------------------------------------------------------------------------

type CalculatePrepayServTotalParams = {
  /** Service price before any discounts. */
  price: number;
  /** Service-level and program-level discounts (customer discount excluded). */
  discounts: Discount[];
  /** Prepay discount percentage (e.g. `5` for 5%). Zero means no prepay. */
  prepayPercent: number;
  /** One rate per customer tax code, as percentages (e.g. `[6.875, 0.5]`). */
  taxRates: number[];
};

/**
 * Calculates the net amount due for a single service in the prepay letter context.
 *
 * Pipeline (per SA5/CRM behavior):
 * 1. Apply service/program discounts via `applyDiscounts`.
 * 2. Apply prepay discount via `calculatePrepayDiscAmt` (half-cent ties round down).
 * 3. Determine `hasDiscount`: true when any service/program discount exists OR prepayPercent > 0.
 * 4. Calculate tax via `calculateTax`, per tax code (ceil when no discount, round when discount).
 * 5. Return postPrepayPrice + tax.
 */
export function calculatePrepayServTotal({
  price,
  discounts,
  prepayPercent,
  taxRates,
}: CalculatePrepayServTotalParams): number {
  const priceAfterDiscounts = applyDiscounts({ price, discounts });
  const prepayDiscAmt = calculatePrepayDiscAmt({ servPrice: priceAfterDiscounts, prepayPercent });
  const postPrepayPrice = priceAfterDiscounts - prepayDiscAmt;
  const hasDiscount = discounts.length > 0 || prepayPercent > 0;
  const tax = calculateTax({ price: postPrepayPrice, taxRates, hasDiscount });
  return postPrepayPrice + tax;
}
