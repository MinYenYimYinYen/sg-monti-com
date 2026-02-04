import { TaxCodeCore, TaxCodeDoc, TaxCodeDocProps, TaxCodeRaw } from "../TaxCodeTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

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
  return extendEntities<TaxCodeCore, TaxCodeDocProps, TaxCodeDoc>({
    cores: taxCodesCore,
    idField: "taxCodeId",
    baseDocProps: {} as TaxCodeDocProps,
  });
}
