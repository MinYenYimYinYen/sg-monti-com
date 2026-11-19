import {
  MnTaxType,
  SalesTaxMappingDoc,
} from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import { mergeMnTaxTypes } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";
import {
  RevenueGroupMember,
  StateTaxRevenueGroup,
  StateTaxRevenueGroupDoc,
} from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

/** How a group is named on screen: its members, because the key is an opaque id. */
export function formatMnTaxCodes(mnTaxCodes: string[]): string {
  return mnTaxCodes.join(" + ");
}

/**
 * What a person reads for a tax type: its description. The code is only the fallback, for a type no
 * saved mapping or built-in list defines any more, because a bare code says nothing to the reader.
 */
export function labelMnTaxCode({
  group,
  mnTaxCode,
}: {
  group: StateTaxRevenueGroup | undefined;
  mnTaxCode: string;
}): string {
  const member = group?.members.find((candidate) => candidate.mnTaxCode === mnTaxCode);
  return member?.mnTaxType?.description ?? mnTaxCode;
}

/** One group per key, members sorted by code, groups sorted by their first code. */
export function buildRevenueGroups({
  docs,
  knownMnTaxTypes,
}: {
  docs: StateTaxRevenueGroupDoc[];
  knownMnTaxTypes: MnTaxType[];
}): StateTaxRevenueGroup[] {
  const mnTaxTypeByCode = new Map(knownMnTaxTypes.map((mnTaxType) => [mnTaxType.code, mnTaxType]));
  const membersByKey = new Map<string, RevenueGroupMember[]>();

  for (const doc of docs) {
    const members = membersByKey.get(doc.revenueGroupKey) ?? [];
    members.push({
      mnTaxCode: doc.mnTaxCode,
      mnTaxType: mnTaxTypeByCode.get(doc.mnTaxCode) ?? null,
    });
    membersByKey.set(doc.revenueGroupKey, members);
  }

  return [...membersByKey.entries()]
    .map(([revenueGroupKey, members]) => ({
      revenueGroupKey,
      members: [...members].sort((a, b) => a.mnTaxCode.localeCompare(b.mnTaxCode)),
    }))
    .sort((a, b) => a.members[0].mnTaxCode.localeCompare(b.members[0].mnTaxCode));
}

/**
 * The Minnesota tax types that can be put in a group: those a saved mapping uses, since only those
 * can ever have a line on the report, minus the ones already in a group.
 */
export function findUngroupedMnTaxTypes({
  mappingDocs,
  groupDocs,
}: {
  mappingDocs: SalesTaxMappingDoc[];
  groupDocs: StateTaxRevenueGroupDoc[];
}): MnTaxType[] {
  const groupedCodes = new Set(groupDocs.map((doc) => doc.mnTaxCode));
  return mergeMnTaxTypes({
    primary: [],
    additional: mappingDocs.flatMap((doc) => doc.mnTaxTypes),
  }).filter((mnTaxType) => !groupedCodes.has(mnTaxType.code));
}
