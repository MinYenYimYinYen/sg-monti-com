const TOPIC_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export const TOPIC_KEY_RULE = "Use lowercase letters, digits, - and _, starting with a letter or digit.";

/** A topic key is joined with `+` to make a document key, so it must never contain one. */
export function isValidTopicKey(topicKey: string): boolean {
  return TOPIC_KEY_PATTERN.test(topicKey);
}

const MAX_NAMED_DOCUMENTS = 5;

/** The refusal shown when a topic cannot be deleted because documents are still tagged with it. */
export function buildTopicInUseMessage({
  topicKey,
  referencingDetails,
}: {
  topicKey: string;
  referencingDetails: { detailKey: string; title: string }[];
}): string {
  const named = referencingDetails
    .slice(0, MAX_NAMED_DOCUMENTS)
    .map((detail) => `"${detail.title}" (${detail.detailKey})`)
    .join(", ");
  const hiddenCount = referencingDetails.length - MAX_NAMED_DOCUMENTS;
  const more = hiddenCount > 0 ? `, and ${hiddenCount} more` : "";
  const noun = referencingDetails.length === 1 ? "document" : "documents";
  return `Topic '${topicKey}' is still used by ${referencingDetails.length} ${noun}: ${named}${more}. Delete those documents or change their topics first.`;
}
