import type { TopicDoc } from "@/app/knowledgeBase/topic/TopicTypes";
import type { SaveTopicDetailVersionParams, TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { isValidTopicKey, normalizeSignals } from "@/app/knowledgeBase/topic/topicLogic";
import { buildDetailKey, normalizeTopicKeys } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import type { TopicDetailDraft, TopicDraft } from "@/app/knowledgeBase/editor/topicEditorTypes";

function sameList({ a, b }: { a: string[]; b: string[] }): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

export function makeBlankTopicDraft(): TopicDraft {
  return { topicKey: "", name: "", description: "", signalsText: "", isNew: true };
}

export function makeTopicDraftFromDoc(doc: TopicDoc): TopicDraft {
  return {
    topicKey: doc.topicKey,
    name: doc.name,
    description: doc.description,
    signalsText: (doc.signals ?? []).join("\n"),
    isNew: false,
  };
}

export function draftSignals(draft: TopicDraft): string[] {
  return normalizeSignals(draft.signalsText.split("\n"));
}

export function topicDraftToUpsertParams(draft: TopicDraft): Omit<TopicDoc, "createdAt" | "updatedAt"> {
  return {
    topicKey: draft.topicKey,
    name: draft.name.trim(),
    description: draft.description.trim(),
    signals: draftSignals(draft),
  };
}

/** A new draft is dirty once anything is typed. A saved one is dirty when it differs from the stored topic. */
export function isTopicDraftDirty({ draft, saved }: { draft: TopicDraft; saved: TopicDoc | undefined }): boolean {
  if (draft.isNew) {
    return draft.topicKey !== "" || draft.name !== "" || draft.description !== "" || draftSignals(draft).length > 0;
  }
  if (!saved) return true;
  return (
    draft.name.trim() !== saved.name ||
    draft.description.trim() !== saved.description ||
    !sameList({ a: draftSignals(draft), b: saved.signals ?? [] })
  );
}

export function canSaveTopicDraft({ draft, keyConflict }: { draft: TopicDraft; keyConflict: boolean }): boolean {
  return (
    isValidTopicKey(draft.topicKey) && draft.name.trim() !== "" && draft.description.trim() !== "" && !keyConflict
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/** TipTap reports an emptied editor as one empty paragraph. */
function isBlankHtml(html: string): boolean {
  return html === "" || html === "<p></p>";
}

export function makeBlankDetailDraft(): TopicDetailDraft {
  return { topicKeys: [], title: "", contentHtml: "", isNew: true, baseVersion: null, comment: "" };
}

/** Opens the head version of a document for editing. Saving builds the next version on top of it. */
export function makeDetailDraftFromDoc(doc: TopicDetailDoc): TopicDetailDraft {
  return {
    topicKeys: doc.topicKeys,
    title: doc.title,
    contentHtml: doc.contentHtml,
    isNew: false,
    baseVersion: doc.version,
    comment: "",
  };
}

/** The key the server will save this draft under, or null while no topic is chosen. */
export function deriveDraftDetailKey(draft: TopicDetailDraft): string | null {
  const topicKeys = normalizeTopicKeys(draft.topicKeys);
  return topicKeys.length > 0 ? buildDetailKey(topicKeys) : null;
}

export function toggleTopicKey({ topicKeys, topicKey }: { topicKeys: string[]; topicKey: string }): string[] {
  return topicKeys.includes(topicKey)
    ? topicKeys.filter((existing) => existing !== topicKey)
    : [...topicKeys, topicKey];
}

export function detailDraftToSaveParams(draft: TopicDetailDraft): SaveTopicDetailVersionParams {
  const comment = draft.comment.trim();
  return {
    topicKeys: normalizeTopicKeys(draft.topicKeys),
    title: draft.title.trim(),
    contentHtml: draft.contentHtml,
    baseVersion: draft.baseVersion,
    ...(comment ? { comment } : {}),
  };
}

export function isDetailDraftDirty({
  draft,
  saved,
}: {
  draft: TopicDetailDraft;
  saved: TopicDetailDoc | undefined;
}): boolean {
  if (draft.isNew) {
    return draft.topicKeys.length > 0 || draft.title !== "" || !isBlankHtml(draft.contentHtml);
  }
  if (!saved) return true;
  return draft.title.trim() !== saved.title || draft.contentHtml !== saved.contentHtml;
}

export function canSaveDetailDraft({ draft, keyConflict }: { draft: TopicDetailDraft; keyConflict: boolean }): boolean {
  return deriveDraftDetailKey(draft) !== null && draft.title.trim() !== "" && !keyConflict;
}
