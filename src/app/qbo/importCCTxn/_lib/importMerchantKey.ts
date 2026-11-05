/**
 * The full description, uppercased with whitespace collapsed. This is the string a person
 * confirms against a vendor (`MerchantMapping.confirmedMerchants`), so it keeps every character.
 */
export function collapseDescription(description: string): string {
  return description.toUpperCase().trim().replace(/\s+/g, " ");
}

/** A trailing store number: "#123", "T-2180" (one or two letters, a dash, digits) or 3+ digits. */
const STORE_NUMBER_TOKEN = /^(#\d+|[A-Z]{1,2}-\d+|\d{3,})$/;

/**
 * The key a mapping or skip rule is stored and matched under. It groups one merchant's
 * descriptions into a family ("KWIK TRIP #109" and "KWIK TRIP #458" are "KWIK TRIP"). Matching
 * is always equality on this string, never "contains".
 *
 * When unsure it splits rather than merges, because a wrong merge puts a wrong vendor on a row,
 * while a wrong split only costs one extra click:
 * - Text after a "*" is dropped only when it is one token containing a digit (an order code, as
 *   in "AMAZON MKTPL*VQ0ST9ZQ3"). Plain words stay ("UBER *EATS", "SQ *JOES PIZZA"), and so does a
 *   multi-word tail ("SQ *BLUE BOTTLE 1234" becomes "SQ *BLUE BOTTLE": only the store number
 *   goes), so processor prefixes never merge different merchants.
 * - Trailing tokens are dropped only when they look like store numbers, so "MOTEL 6" keeps its 6.
 * - The key is never empty: it falls back to the full description.
 *
 * If these rules change, every stored key may need re-deriving. `confirmedMerchants` keeps the
 * full descriptions so that can be done.
 */
export function buildMerchantKey(description: string): string {
  const full = collapseDescription(description);

  let text = full;
  const starIndex = text.indexOf("*");
  if (starIndex !== -1) {
    const afterStar = text.slice(starIndex + 1).trim();
    const isSingleCode = afterStar.length > 0 && !afterStar.includes(" ") && /\d/.test(afterStar);
    if (isSingleCode) text = text.slice(0, starIndex).trim();
  }

  const tokens = text.split(" ");
  while (tokens.length > 1 && STORE_NUMBER_TOKEN.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const key = tokens.join(" ").trim();
  return key.length > 0 ? key : full;
}

/** Open rows whose stored key no longer matches what the current rules give for their description. */
export function findRowsNeedingNewKey<
  T extends { rowId: string; description: string; merchantKey: string },
>(rows: T[]): { rowId: string; merchantKey: string }[] {
  const changed: { rowId: string; merchantKey: string }[] = [];
  for (const row of rows) {
    const merchantKey = buildMerchantKey(row.description);
    if (merchantKey !== row.merchantKey) changed.push({ rowId: row.rowId, merchantKey });
  }
  return changed;
}

/**
 * A loose form of the description used only to offer mapping suggestions (shown at the top of
 * the vendor and account dropdowns, highlighted). It must never be used to apply a mapping.
 * First guess, to be tuned against real exports.
 *
 * "AMAZON MKTPL*VQ0ST9ZQ3" -> "AMAZON MKTPL", "CIRCLEK #2746238" -> "CIRCLEK",
 * "TARGET T-2180" -> "TARGET", "BP#3213900MONTICELLO BP" -> "BP MONTICELLO BP".
 */
export function buildMerchantSuggestionKey(description: string): string {
  const upper = collapseDescription(description);

  const beforeStar = upper.split("*")[0];
  const withoutStoreNumbers = beforeStar.replace(/#\d+/g, " ");
  const tokens = withoutStoreNumbers.split(/\s+/).filter((token) => token.length > 0);

  // Trailing store or reference codes carry digits; drop them but never drop every word.
  while (tokens.length > 1 && /\d/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const key = tokens.join(" ");
  return key.length > 0 ? key : upper;
}
