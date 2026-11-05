import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { buildMerchantKey, collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

// Pure helpers for confirming descriptions. A mapping is stored under a family key ("KWIK TRIP"),
// but a person confirms each full description ("KWIK TRIP #109") next to the vendor. An
// unconfirmed description still gets the mapping pre-filled and is never blocked from posting. It
// is only marked, so a person can look at it and tick it.

const KEY_SEPARATOR = "\u001f";

/** One confirmed description of one merchant family, as a single string for set lookups. */
export function confirmationKey({
  merchantKey,
  description,
}: {
  merchantKey: string;
  description: string;
}): string {
  return `${merchantKey}${KEY_SEPARATOR}${collapseDescription(description)}`;
}

/** Every confirmed description of every mapping. The selector builds this once for all components. */
export function buildConfirmedKeySet(
  mappings: Pick<MerchantMapping, "merchantKey" | "confirmedMerchants">[],
): Set<string> {
  const keys = new Set<string>();
  for (const mapping of mappings) {
    // Documents stored before this field existed have no list.
    for (const description of mapping.confirmedMerchants ?? []) {
      keys.add(confirmationKey({ merchantKey: mapping.merchantKey, description }));
    }
  }
  return keys;
}

export function isDescriptionConfirmed({
  confirmedKeys,
  merchantKey,
  description,
}: {
  confirmedKeys: Set<string>;
  merchantKey: string;
  description: string;
}): boolean {
  return confirmedKeys.has(confirmationKey({ merchantKey, description }));
}

/**
 * The rows that have a mapping but whose own description has not been confirmed. A row with no
 * mapping is not listed: it has nothing pre-filled to look at yet.
 */
export function findUnconfirmedRowIds({
  rows,
  mappingMap,
  confirmedKeys,
}: {
  rows: Pick<ImportRow, "rowId" | "merchantKey" | "description">[];
  mappingMap: Map<string, unknown>;
  confirmedKeys: Set<string>;
}): string[] {
  return rows
    .filter(
      (row) =>
        mappingMap.has(row.merchantKey) &&
        !isDescriptionConfirmed({
          confirmedKeys,
          merchantKey: row.merchantKey,
          description: row.description,
        }),
    )
    .map((row) => row.rowId);
}

/**
 * How a saved mapping changes its confirmed list. The same vendor keeps what was confirmed and
 * adds to it. A different vendor starts over, because earlier confirmations were made against
 * the old vendor.
 */
export type ConfirmedUpdateMode = "add" | "replace";

export function confirmedUpdateMode({
  existingVendorId,
  vendorId,
}: {
  existingVendorId: string | null;
  vendorId: string;
}): ConfirmedUpdateMode {
  return existingVendorId !== null && existingVendorId === vendorId ? "add" : "replace";
}

/** The collapsed description to store, or a problem when it does not belong to the merchant family. */
export function validateConfirmation({
  merchantKey,
  description,
}: {
  merchantKey: string;
  description: string;
}): { confirmedDescription: string; problem: string | null } {
  const confirmedDescription = collapseDescription(description);
  if (confirmedDescription.length === 0) {
    return { confirmedDescription, problem: "Choose a description to confirm." };
  }
  if (buildMerchantKey(confirmedDescription) !== merchantKey) {
    return { confirmedDescription, problem: "That description does not belong to this merchant." };
  }
  return { confirmedDescription, problem: null };
}
