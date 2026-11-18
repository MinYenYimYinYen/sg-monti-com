import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

/**
 * A RealGreen tax code with a 0% rate and no Minnesota mapping is an exempt account (a church, say),
 * not a mapping someone forgot. `taxRate` is null when the code is not in the loaded tax codes, which
 * is never exempt. The placeholder RealGreen puts in for an unresolved tax id also has a 0% rate, so
 * it is excluded: treating it as exempt would hide that the tax codes failed to load.
 */
export function isExemptTaxCode({
  taxCodeId,
  taxRate,
  isMapped,
}: {
  taxCodeId: string;
  taxRate: number | null;
  isMapped: boolean;
}): boolean {
  return !isMapped && taxRate === 0 && taxCodeId !== baseStrId;
}
