import {
  calculatePrepayDiscAmt,
  calculateTaxAmt,
  calculateServTotal,
} from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import type { ProgChooserPricingInput, ProgChooserPricingResult } from "./ProgChooserTypes";

/**
 * Computes resolved pricing for a single selected program in the progChooser loop.
 *
 * Price cascade (highest priority first):
 *   1. progPriceOverride  — Phase 3: program-level override (per-visit)
 *   2. scoped.getServPrice(size)  — price chart (pref or econ, scoped to included servCodes)
 *
 * `servPrice` reflects the effective per-visit price (override if set, otherwise chart price).
 * `prefPrice` and `econPrice` always reflect the chart prices for informational display.
 * `subTotal` = effectiveServPrice × includedServCodes.length.
 */
export function computeProgChooserPricing({
  progCode,
  includedServCodeIds,
  size,
  effectiveTaxRate,
  prepayPercent,
  progPriceOverride,
}: ProgChooserPricingInput): ProgChooserPricingResult {
  const hasSize = !isNaN(size) && size > 0;
  const pp = prepayPercent ?? 0;
  const tr = effectiveTaxRate ?? 0;

  // Scope to included servCodes so isEcon is evaluated against the selected count,
  // matching the behavior of the program.{alias}.* system.
  const scoped = progCode.x.getByServCodeIds(includedServCodeIds);

  // Price-chart price — scoped so minForPreferred uses includedServCodeIds.length.
  const chartServPrice = hasSize ? scoped.getServPrice(size) : null;

  // Effective per-visit price: program override takes priority over price chart.
  const effectiveServPrice = hasSize ? (progPriceOverride ?? chartServPrice) : null;

  const includedServCodes = progCode.servCodes.filter((s) =>
    includedServCodeIds.includes(s.servCodeId),
  );

  const servTable = includedServCodes.map((servCode) => ({
    description: servCode.longName,
    price: effectiveServPrice,
  }));

  // subTotal = sum of all resolved servCode prices.
  let subTotal: number | null = null;
  if (hasSize && effectiveServPrice !== null) {
    subTotal = effectiveServPrice * includedServCodes.length;
  } else if (hasSize && includedServCodes.length === 0) {
    subTotal = 0;
  }

  // Prepay, tax, and total are computed per-servCode then summed (matches SA5 behavior).
  let prepayDiscAmt: number | null = null;
  let taxAmt: number | null = null;
  let total: number | null = null;

  if (hasSize && effectiveServPrice !== null) {
    const discPerServ = calculatePrepayDiscAmt({ servPrice: effectiveServPrice, prepayPercent: pp });
    prepayDiscAmt = discPerServ * includedServCodes.length;

    if (effectiveTaxRate !== null) {
      const taxPerServ = calculateTaxAmt({ servPrice: effectiveServPrice, prepayDiscAmt: discPerServ, taxRate: tr });
      taxAmt = taxPerServ * includedServCodes.length;

      const totalPerServ = calculateServTotal({ servPrice: effectiveServPrice, prepayDiscAmt: discPerServ, taxAmt: taxPerServ });
      total = totalPerServ * includedServCodes.length;
    }
  }

  return {
    alias: progCode.progCodeId,
    progCodeId: progCode.progCodeId,
    description: progCode.description,
    servCount: includedServCodeIds.length,
    prefPrice: hasSize ? scoped.getPrefPrice(size) : null,
    econPrice: hasSize ? scoped.getEconPrice(size) : null,
    servPrice: effectiveServPrice,
    subTotal,
    prepayPercent,
    prepayDiscAmt,
    taxAmt,
    total,
    servTable,
  };
}
