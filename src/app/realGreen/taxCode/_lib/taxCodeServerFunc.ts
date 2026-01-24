import { TaxCodeCore, TaxCodeDoc, TaxCodeRaw } from "../TaxCodeTypes";

function remapTaxCode(raw: TaxCodeRaw): TaxCodeCore {
  return {
    taxCodeId: raw.id,
    available: raw.available,
    taxRate: raw.taxRate,
  };
}

export function remapTaxCodes(raw: TaxCodeRaw[]): TaxCodeCore[] {
  return raw.map(remapTaxCode);
}

export async function extendTaxCodes(
  taxCodesCore: TaxCodeCore[],
): Promise<TaxCodeDoc[]> {
  return taxCodesCore as TaxCodeDoc[];
}
