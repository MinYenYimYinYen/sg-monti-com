/** Trims, drops blanks, deduplicates and sorts, so `[sales, aeration]` and `[aeration, sales]` are one tag set. */
export function normalizeTopicKeys(topicKeys: string[]): string[] {
  const trimmed = topicKeys.map((topicKey) => topicKey.trim()).filter((topicKey) => topicKey.length > 0);
  return [...new Set(trimmed)].sort();
}

/** Expects keys already normalized by `normalizeTopicKeys`. */
export function buildDetailKey(normalizedTopicKeys: string[]): string {
  return normalizedTopicKeys.join("+");
}

export function findUnknownTopicKeys({
  topicKeys,
  knownTopicKeys,
}: {
  topicKeys: string[];
  knownTopicKeys: string[];
}): string[] {
  const known = new Set(knownTopicKeys);
  return topicKeys.filter((topicKey) => !known.has(topicKey));
}

type TagSetKeyed = { detailKey: string; topicKeys: string[] };

/**
 * Sort comparator, general to specific: fewest tags first. Equal counts fall back to `detailKey`
 * only to keep the order stable; they have no real precedence.
 */
export function compareBySpecificity(a: TagSetKeyed, b: TagSetKeyed): number {
  return a.topicKeys.length - b.topicKeys.length || a.detailKey.localeCompare(b.detailKey);
}

/**
 * Reference implementation of the retrieval rule consumers apply: every document whose tags are all
 * among the matched topics, ordered general to specific (fewest tags first). A more specific document
 * wins when two conflict, which is why the order matters. Equal tag counts are ordered by `detailKey`
 * only to keep the result stable; they have no real precedence.
 */
export function resolveDetails<T extends { detailKey: string; topicKeys: string[] }>({
  matchedTopicKeys,
  details,
}: {
  matchedTopicKeys: string[];
  details: T[];
}): T[] {
  const matched = new Set(matchedTopicKeys);
  return details
    .filter((detail) => detail.topicKeys.length > 0 && detail.topicKeys.every((topicKey) => matched.has(topicKey)))
    .sort(compareBySpecificity);
}
