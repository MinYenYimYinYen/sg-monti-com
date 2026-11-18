import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

export type MnJurisdiction = "state" | "county" | "city" | "region";

/**
 * One line of the Minnesota sales tax return (a Department of Revenue tax type code). Only
 * percentage-based, place-based Sales codes are modeled: this business collects no Use, flat-fee or
 * per-industry taxes.
 *
 * `fipsCode` is a string because codes such as "059" and "00694" keep their leading zeros.
 * `ratePercent` is a whole percent (6.875 means 6.875%), the same unit as RealGreen's `taxRate`.
 * `endedOn` is set for codes the state no longer uses; they stay selectable for late or amended
 * returns of past months.
 */
export type MnTaxType = {
  code: string;
  description: string;
  fipsCode: string | null;
  ratePercent: number;
  jurisdiction: MnJurisdiction;
  effectiveFrom: string | null;
  endedOn: string | null;
};

/**
 * Which Minnesota tax types a RealGreen tax code files under. The whole `MnTaxType` objects are
 * stored, not just their codes, because the state adds codes now and then and there is no feed to
 * link them to: a type defined in the mapping dialog lives only inside the mappings that use it.
 *
 * Person reference: none. The mapping is shared configuration that no one owns, so nothing is stored
 * about who edited it and nothing belongs in `deleteUserReferences`.
 */
export type SalesTaxMappingDoc = CreatedUpdated & {
  taxCodeId: string;
  mnTaxTypes: MnTaxType[];
};

/** `exempt` is an unmapped tax code with a 0% rate, which needs no Minnesota mapping. */
export type SalesTaxMappingStatus = "unmapped" | "exempt" | "match" | "mismatch" | "orphan";

/**
 * The shape the UI consumes: one row per RealGreen tax code, so it exists for tax codes that have
 * no `SalesTaxMappingDoc` yet. `taxCode` is null for an orphan, a mapping whose RealGreen tax code
 * is gone.
 */
export type SalesTaxMappingRow = {
  taxCodeId: string;
  taxCode: TaxCode | null;
  mnTaxTypes: MnTaxType[];
  mappedPercent: number;
  status: SalesTaxMappingStatus;
};
