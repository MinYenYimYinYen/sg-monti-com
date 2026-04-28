import {
  calculatePrepayDiscAmt,
  calculateTaxAmt,
  calculateServTotal,
} from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { ProgramVariables } from "../QuickSendTypes";

type ProgramPricingInput = {
  progCode: ProgCode;
  includedServCodeIds: string[];
  size: number;
  effectiveTaxRate: number | null;
  prepayPercent: number | null;
  priceOverride: number | null;
  isInstallment: boolean;
};

/**
 * Computes resolved pricing for a single selected program.
 *
 * Price cascade (highest priority first):
 *   1. priceOverride  — call-time program-level override (per-visit)
 *   2. scoped.getServPrice(size)  — price chart (pref or econ, scoped to included servCodes)
 *
 * `servPrice` reflects the effective per-visit price (override if set, otherwise chart price).
 * `prefPrice` and `econPrice` always reflect the chart prices for informational display.
 * `subTotal` = effectiveServPrice × includedServCodes.length.
 */
export function computeProgramPricing({
  progCode,
  includedServCodeIds,
  size,
  effectiveTaxRate,
  prepayPercent,
  priceOverride,
}: ProgramPricingInput): ProgramVariables {
  const hasSize = !isNaN(size) && size > 0;
  const pp = prepayPercent ?? 0;
  const tr = effectiveTaxRate ?? 0;

  // Scope to included servCodes so isEcon is evaluated against the selected count.
  const scoped = progCode.x.getByServCodeIds(includedServCodeIds);

  const chartServPrice = hasSize ? scoped.getServPrice(size) : null;
  const effectiveServPrice = hasSize ? (priceOverride ?? chartServPrice) : null;

  const includedServCodes = progCode.servCodes.filter((s) =>
    includedServCodeIds.includes(s.servCodeId),
  );

  const servTable = includedServCodes.map((servCode) => ({
    description: servCode.longName,
    price: effectiveServPrice,
  }));

  let subTotal: number | null = null;
  if (hasSize && effectiveServPrice !== null) {
    subTotal = effectiveServPrice * includedServCodes.length;
  } else if (hasSize && includedServCodes.length === 0) {
    subTotal = 0;
  }

  let prepayDiscAmt: number | null = null;
  let taxAmt: number | null = null;
  let total: number | null = null;

  if (hasSize && effectiveServPrice !== null) {
    // Only compute prepay amounts when a prepay rate is actually selected.
    // null prepayPercent means "no prepay chosen" — render as unfulfilled in preview.
    const discPerServ = prepayPercent !== null
      ? calculatePrepayDiscAmt({ servPrice: effectiveServPrice, prepayPercent: pp })
      : 0;
    prepayDiscAmt = prepayPercent !== null
      ? discPerServ * includedServCodes.length
      : null;

    if (effectiveTaxRate !== null) {
      const taxPerServ = calculateTaxAmt({ servPrice: effectiveServPrice, prepayDiscAmt: discPerServ, taxRate: tr });
      taxAmt = taxPerServ * includedServCodes.length;

      const totalPerServ = calculateServTotal({ servPrice: effectiveServPrice, prepayDiscAmt: discPerServ, taxAmt: taxPerServ });
      total = totalPerServ * includedServCodes.length;
    }
  }

  const monthPrice =
    effectiveServPrice !== null && includedServCodes.length > 0
      ? Math.round((effectiveServPrice * includedServCodes.length / 12) * 100) / 100
      : null;

  return {
    progCodeId: progCode.progCodeId,
    isInstallment: progCode.isInstallment,
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
    monthPrice,
    servTable,
  };
}
