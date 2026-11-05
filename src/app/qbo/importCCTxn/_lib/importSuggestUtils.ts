import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { buildMerchantSuggestionKey } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

// Suggestions only rank choices in the dropdowns. Nothing here ever applies a mapping.

const MIN_MATCH_LENGTH = 3;

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Vendors whose name looks like the merchant. A vendor matches when its whole name appears in
 * the loose key ("AMAZON" in "AMAZON MKTPL") or its name starts with the key's first word.
 * Three characters minimum, so a short word never matches half the list.
 */
export function suggestVendorIds({
  vendors,
  merchantKey,
}: {
  vendors: QboVendorSummary[];
  merchantKey: string;
}): Set<string> {
  const suggestionKey = buildMerchantSuggestionKey(merchantKey);
  const wholeKey = normalizeForMatch(suggestionKey);
  const firstWord = normalizeForMatch(suggestionKey.split(" ")[0] ?? "");

  const suggestedIds = new Set<string>();
  for (const vendor of vendors) {
    const name = normalizeForMatch(vendor.DisplayName);
    if (name.length < MIN_MATCH_LENGTH) continue;
    const nameInKey = wholeKey.includes(name);
    const nameStartsWithFirstWord =
      firstWord.length >= MIN_MATCH_LENGTH && name.startsWith(firstWord);
    if (nameInKey || nameStartsWithFirstWord) suggestedIds.add(vendor.Id);
  }
  return suggestedIds;
}

/**
 * Accounts already used for this merchant, or for merchants that look like it (same loose key,
 * for example two store numbers of one chain).
 */
export function suggestAccountIds({
  merchantMappings,
  merchantKey,
}: {
  merchantMappings: MerchantMapping[];
  merchantKey: string;
}): Set<string> {
  const suggestionKey = buildMerchantSuggestionKey(merchantKey);
  const suggestedIds = new Set<string>();
  for (const mapping of merchantMappings) {
    if (buildMerchantSuggestionKey(mapping.merchantKey) !== suggestionKey) continue;
    suggestedIds.add(mapping.defaultAccountId);
    mapping.otherAccountIds.forEach((accountId) => suggestedIds.add(accountId));
  }
  return suggestedIds;
}

/** Vendors that earlier look-alike merchants were mapped to are suggested too. */
export function suggestVendorIdsFromMappings({
  merchantMappings,
  merchantKey,
}: {
  merchantMappings: MerchantMapping[];
  merchantKey: string;
}): Set<string> {
  const suggestionKey = buildMerchantSuggestionKey(merchantKey);
  return new Set(
    merchantMappings
      .filter((mapping) => buildMerchantSuggestionKey(mapping.merchantKey) === suggestionKey)
      .map((mapping) => mapping.vendorId),
  );
}
