import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

/**
 * Says a Minnesota tax type belongs to a revenue group: the state requires every type in the group
 * to report identical revenue. Types that share a `revenueGroupKey` are in the same group, and a
 * group exists only while at least one doc carries its key, so there is no group doc to orphan.
 *
 * `mnTaxCode` is a `MnTaxType.code`. It is the natural key because a type is in at most one group.
 * It is a code and not a stored `MnTaxType` because the definition lives in the mappings and in
 * `MN_TAX_TYPES`, and a second copy here would drift.
 *
 * Person reference: none. The grouping is shared configuration that no one owns, so nothing is
 * stored about who edited it and nothing belongs in `deleteUserReferences`.
 */
export type StateTaxRevenueGroupDoc = CreatedUpdated & {
  mnTaxCode: string;
  revenueGroupKey: string;
};

/** `mnTaxType` is null when no saved mapping and no built-in list defines the code any more. */
export type RevenueGroupMember = {
  mnTaxCode: string;
  mnTaxType: MnTaxType | null;
};

/** What the UI consumes: the docs sharing a key, with each code resolved to its definition. */
export type StateTaxRevenueGroup = {
  revenueGroupKey: string;
  members: RevenueGroupMember[];
};
