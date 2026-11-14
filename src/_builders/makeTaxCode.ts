import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { baseTaxCodeDoc } from "@/app/realGreen/taxCode/_lib/baseTaxCode";

/**
 * `taxRate` is a whole-number percentage: 7.375 means 7.375%.
 *
 * The default `taxCodeId` follows the rate, so a customer with several tax codes gets
 * distinct ids without naming them. Tax is rounded per code, so build several codes
 * (6.875 and 0.5) rather than one pre-summed rate.
 */
export function makeTaxCode(overrides: Partial<TaxCode> = {}): TaxCode {
  return {
    ...baseTaxCodeDoc,
    taxCodeId: `TX-${overrides.taxRate ?? 0}`,
    ...overrides,
  };
}
