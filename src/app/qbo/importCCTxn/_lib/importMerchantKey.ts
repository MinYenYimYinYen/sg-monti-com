/**
 * The key a stored merchant mapping is matched by: the full description, uppercased with
 * whitespace collapsed. Deliberately no suffix stripping, so two different merchants can never
 * share a mapping by accident. Looser matching is done by suggestions, never by the key.
 */
export function buildMerchantKey(description: string): string {
  return description.toUpperCase().trim().replace(/\s+/g, " ");
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
  const upper = buildMerchantKey(description);

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
