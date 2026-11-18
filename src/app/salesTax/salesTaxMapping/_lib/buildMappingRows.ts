import {
  MnTaxType,
  SalesTaxMappingDoc,
  SalesTaxMappingRow,
  SalesTaxMappingStatus,
} from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import { ratesMatch, sumRatePercent } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";
import { isExemptTaxCode } from "@/app/salesTax/_lib/isExemptTaxCode";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

function statusOf({
  taxCode,
  mnTaxTypes,
  mappedPercent,
}: {
  taxCode: TaxCode | null;
  mnTaxTypes: MnTaxType[];
  mappedPercent: number;
}): SalesTaxMappingStatus {
  if (!taxCode) return "orphan";
  if (mnTaxTypes.length === 0) {
    const isExempt = isExemptTaxCode({
      taxCodeId: taxCode.taxCodeId,
      taxRate: taxCode.taxRate,
      isMapped: false,
    });
    return isExempt ? "exempt" : "unmapped";
  }
  return ratesMatch({ mappedPercent, taxRate: taxCode.taxRate }) ? "match" : "mismatch";
}

/**
 * One row per RealGreen tax code, mapped or not, plus a row for any mapping whose tax code RealGreen
 * no longer returns, so a stale mapping stays visible instead of silently vanishing.
 */
export function buildMappingRows({
  taxCodes,
  docs,
}: {
  taxCodes: TaxCode[];
  docs: SalesTaxMappingDoc[];
}): SalesTaxMappingRow[] {
  const docsByTaxCodeId = new Map(docs.map((doc) => [doc.taxCodeId, doc]));
  const taxCodeIds = new Set(taxCodes.map((taxCode) => taxCode.taxCodeId));

  const taxCodeRows = taxCodes.map((taxCode): SalesTaxMappingRow => {
    const mnTaxTypes = docsByTaxCodeId.get(taxCode.taxCodeId)?.mnTaxTypes ?? [];
    const mappedPercent = sumRatePercent(mnTaxTypes);
    return {
      taxCodeId: taxCode.taxCodeId,
      taxCode,
      mnTaxTypes,
      mappedPercent,
      status: statusOf({ taxCode, mnTaxTypes, mappedPercent }),
    };
  });

  const orphanRows = docs
    .filter((doc) => !taxCodeIds.has(doc.taxCodeId))
    .map(
      (doc): SalesTaxMappingRow => ({
        taxCodeId: doc.taxCodeId,
        taxCode: null,
        mnTaxTypes: doc.mnTaxTypes,
        mappedPercent: sumRatePercent(doc.mnTaxTypes),
        status: "orphan",
      }),
    );

  return [...taxCodeRows, ...orphanRows].sort((a, b) => a.taxCodeId.localeCompare(b.taxCodeId));
}
