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
 */
export function calculatePrepayDiscAmt({ servPrice, prepayPercent }: CalculatePrepayDiscAmtParams): number {
  return Math.round(servPrice * (prepayPercent / 100) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Tax amount (per service, post-prepay)
// ---------------------------------------------------------------------------

type CalculateTaxAmtParams = {
  servPrice: number;
  /** Per-service prepay discount already calculated via `calculatePrepayDiscAmt`. */
  prepayDiscAmt: number;
  /** Effective tax rate as a percentage (e.g. `8.25` for 8.25%). */
  taxRate: number;
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
export function calculateTaxAmt({ servPrice, prepayDiscAmt, taxRate }: CalculateTaxAmtParams): number {
  const postPrepayPrice = servPrice - prepayDiscAmt;
  return calculateTax({ price: postPrepayPrice, taxRate, hasDiscount: false });
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
  /** Effective tax rate as a percentage (e.g. `8.25` for 8.25%). */
  taxRate: number;
  hasDiscount: boolean;
};

/**
 * Calculates the tax amount for a single service price.
 *
 * Tax is calculated per service — the caller sums results for a program total.
 *
 * Rounding is asymmetric (matches SA5 behavior):
 * - If a discount was applied: ceil(rawTax × 100) / 100
 * - If no discount was applied: round(rawTax × 100) / 100
 *
 * Returns 0 if `taxRate` is 0.
 */
export function calculateTax({ price, taxRate, hasDiscount }: CalculateTaxParams): number {
  if (taxRate === 0) return 0;

  const rawTax = price * (taxRate / 100);

  if (hasDiscount) {
    return Math.ceil(rawTax * 100) / 100;
  }
  return Math.round(rawTax * 100) / 100;
}
