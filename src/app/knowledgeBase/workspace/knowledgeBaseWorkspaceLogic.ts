import type { EditorTab } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceTypes";

const EDITOR_TABS: readonly EditorTab[] = ["topic", "document", "approval"];

/** Radix hands tab values back as plain strings. */
export function isEditorTab(value: string): value is EditorTab {
  return EDITOR_TABS.some((tab) => tab === value);
}

/**
 * Opening a document normally shows it in the editor. A reviewer already on the Approval tab stays
 * there, so they can click down the list reading each document without being thrown into the editor.
 */
export function tabAfterOpeningDetail(currentTab: EditorTab): EditorTab {
  return currentTab === "approval" ? "approval" : "document";
}

/** Longest-waiting first, so the oldest request is the first one a reviewer sees. ISO dates sort as text. */
export function sortWaitingLongestFirst<TDetail extends { createdAt: string }>(details: TDetail[]): TDetail[] {
  return [...details].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Documents tagged with the topic, in their given order. A null topic key keeps them all. */
export function filterDetailsByTopic<TDetail extends { topicKeys: string[] }>({
  details,
  topicKey,
}: {
  details: TDetail[];
  topicKey: string | null;
}): TDetail[] {
  if (topicKey === null) return details;
  return details.filter((detail) => detail.topicKeys.includes(topicKey));
}
