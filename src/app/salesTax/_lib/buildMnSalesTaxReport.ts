import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { toCents } from "@/app/salesTax/_lib/buildSalesTaxReport";
import { isExemptTaxCode } from "@/app/salesTax/_lib/isExemptTaxCode";
import { summarizeServices } from "@/app/salesTax/_lib/summarizeServices";
import {
  MnTaxType,
  SalesTaxMappingDoc,
  SalesTaxMappingRow,
} from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import {
  MnSalesTaxReport,
  MnTaxLine,
  NonTaxableSales,
  RealGreenTaxReport,
  UnmappedTaxCodeSummary,
} from "@/app/salesTax/salesTaxTypes";

function getMappedTaxCodeIds(mappingDocs: SalesTaxMappingDoc[]): Set<string> {
  return new Set(
    mappingDocs.filter((doc) => doc.mnTaxTypes.length > 0).map((doc) => doc.taxCodeId),
  );
}

function isExemptUnmapped({
  taxCodeId,
  taxCodeMap,
}: {
  taxCodeId: string;
  taxCodeMap: Map<string, TaxCode>;
}): boolean {
  return isExemptTaxCode({
    taxCodeId,
    taxRate: taxCodeMap.get(taxCodeId)?.taxRate ?? null,
    isMapped: false,
  });
}

/**
 * RealGreen tax codes used by the report's services that have no mapping and are not exempt. An
 * exempt code (0% rate) needs no Minnesota line, so it is not something left to do.
 */
export function findUnmappedTaxCodeIds({
  taxReport,
  mappingDocs,
  taxCodeMap,
}: {
  taxReport: RealGreenTaxReport;
  mappingDocs: SalesTaxMappingDoc[];
  taxCodeMap: Map<string, TaxCode>;
}): string[] {
  const mappedTaxCodeIds = getMappedTaxCodeIds(mappingDocs);
  return [...taxReport.byTaxCodeId.keys()]
    .filter((id) => !mappedTaxCodeIds.has(id) && !isExemptUnmapped({ taxCodeId: id, taxCodeMap }))
    .sort();
}

/**
 * Mapped tax codes the report uses whose Minnesota rates do not add up to the RealGreen rate. Their
 * Minnesota tax differs from what RealGreen charged the customer, so the mapping is worth checking.
 */
export function findMismatchedTaxCodeIds({
  taxReport,
  mappingRows,
}: {
  taxReport: RealGreenTaxReport;
  mappingRows: SalesTaxMappingRow[];
}): string[] {
  return mappingRows
    .filter((row) => row.status === "mismatch" && taxReport.byTaxCodeId.has(row.taxCodeId))
    .map((row) => row.taxCodeId)
    .sort();
}

type RunningMnTaxLine = {
  mnTaxType: MnTaxType;
  taxCodeIds: string[];
  services: Set<Service>;
};

function toMnTaxLine(running: RunningMnTaxLine): MnTaxLine {
  return {
    mnTaxType: running.mnTaxType,
    taxCodeIds: running.taxCodeIds,
    summary: summarizeServices({
      services: [...running.services],
      ratePercent: running.mnTaxType.ratePercent,
    }),
  };
}

/**
 * Regroups the RealGreen report by Minnesota tax type. Every service under a mapped RealGreen tax
 * code goes onto each Minnesota type that code maps to, and onto each type once however many of its
 * customer's codes lead there. Tax is the type's rate on that line's net after all discounts.
 *
 * A service counts as non-taxable only when it is on no Minnesota line and under no unmapped code:
 * a customer with a taxable code and an exempt one stays taxable. Customers with no tax code at all
 * are non-taxable too.
 */
export function buildMnSalesTaxReport({
  taxReport,
  mappingDocs,
  taxCodeMap,
}: {
  taxReport: RealGreenTaxReport;
  mappingDocs: SalesTaxMappingDoc[];
  taxCodeMap: Map<string, TaxCode>;
}): MnSalesTaxReport {
  const mnTaxTypesByTaxCodeId = new Map(mappingDocs.map((doc) => [doc.taxCodeId, doc.mnTaxTypes]));
  const runningByCode = new Map<string, RunningMnTaxLine>();
  const claimedServices = new Set<Service>();
  let realGreenMappedTaxCents = 0;

  for (const [taxCodeId, taxCodeSummary] of taxReport.byTaxCodeId) {
    const mnTaxTypes = mnTaxTypesByTaxCodeId.get(taxCodeId) ?? [];
    if (mnTaxTypes.length === 0) continue;
    realGreenMappedTaxCents += toCents(taxCodeSummary.taxAmount);

    for (const mnTaxType of mnTaxTypes) {
      const running = runningByCode.get(mnTaxType.code) ?? {
        mnTaxType,
        taxCodeIds: [],
        services: new Set<Service>(),
      };
      running.taxCodeIds.push(taxCodeId);
      for (const service of taxCodeSummary.services) {
        running.services.add(service);
        claimedServices.add(service);
      }
      runningByCode.set(mnTaxType.code, running);
    }
  }

  const mnTaxLines = [...runningByCode.values()]
    .map(toMnTaxLine)
    .sort((a, b) => a.mnTaxType.code.localeCompare(b.mnTaxType.code));

  const unmappedTaxCodes = findUnmappedTaxCodeIds({ taxReport, mappingDocs, taxCodeMap }).map(
    (taxCodeId): UnmappedTaxCodeSummary => {
      const summary = taxReport.byTaxCodeId.get(taxCodeId)!;
      for (const service of summary.services) claimedServices.add(service);
      return { taxCodeId, summary };
    },
  );

  const mappedTaxCodeIds = getMappedTaxCodeIds(mappingDocs);
  const nonTaxableSales: NonTaxableSales[] = [];
  for (const [taxCodeId, taxCodeSummary] of taxReport.byTaxCodeId) {
    if (mappedTaxCodeIds.has(taxCodeId) || !isExemptUnmapped({ taxCodeId, taxCodeMap })) continue;
    const services = taxCodeSummary.services.filter((service) => !claimedServices.has(service));
    if (services.length === 0) continue;
    nonTaxableSales.push({ taxCodeId, summary: summarizeServices({ services, ratePercent: 0 }) });
  }
  nonTaxableSales.sort((a, b) => (a.taxCodeId ?? "").localeCompare(b.taxCodeId ?? ""));
  if (taxReport.untaxed.services.length > 0) {
    nonTaxableSales.push({ taxCodeId: null, summary: taxReport.untaxed });
  }

  const nonTaxableServices = new Set(nonTaxableSales.flatMap(({ summary }) => summary.services));
  const mnTaxCents = mnTaxLines.reduce((sum, line) => sum + toCents(line.summary.taxAmount), 0);

  return {
    mnTaxLines,
    unmappedTaxCodes,
    nonTaxableSales,
    nonTaxableTotal: summarizeServices({ services: [...nonTaxableServices], ratePercent: 0 }),
    total: taxReport.total,
    mnTaxAmount: mnTaxCents / 100,
    realGreenMappedTaxAmount: realGreenMappedTaxCents / 100,
  };
}
