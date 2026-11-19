import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { isValidTopicKey, TOPIC_KEY_RULE } from "@/app/knowledgeBase/topic/topicLogic";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import {
  canSaveDetailDraft,
  canSaveTopicDraft,
  deriveDraftDetailKey,
  isDetailDraftDirty,
  isTopicDraftDirty,
} from "@/app/knowledgeBase/editor/topicEditorLogic";

const selectTopicDraft = (state: AppState) => state.topicEditor.topicDraft;
const selectDetailDraft = (state: AppState) => state.topicEditor.detailDraft;
const selectDetailDraftVersion = (state: AppState) => state.topicEditor.detailDraftVersion;

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

const selectSavedTopic = createSelector([selectTopicDraft, topicSelect.docsByKey], (draft, docsByKey) =>
  draft && !draft.isNew ? docsByKey.get(draft.topicKey) : undefined,
);

/** A new draft whose key is already taken. Saving would silently replace that topic. */
const selectTopicKeyConflict = createSelector(
  [selectTopicDraft, topicSelect.docsByKey],
  (draft, docsByKey) => draft !== null && draft.isNew && docsByKey.has(draft.topicKey),
);

/** Only a new draft can have a bad key, since a saved topic's key is locked. Blank is not an error yet. */
const selectTopicKeyError = createSelector([selectTopicDraft], (draft): string | null => {
  if (!draft || !draft.isNew || draft.topicKey === "") return null;
  return isValidTopicKey(draft.topicKey) ? null : TOPIC_KEY_RULE;
});

const selectTopicIsDirty = createSelector([selectTopicDraft, selectSavedTopic], (draft, saved) =>
  draft ? isTopicDraftDirty({ draft, saved }) : false,
);

const selectTopicCanSave = createSelector([selectTopicDraft, selectTopicKeyConflict], (draft, keyConflict) =>
  draft ? canSaveTopicDraft({ draft, keyConflict }) : false,
);

/** Draft name for the header. Empty string means untitled, null means nothing is open. */
const selectTopicActiveName = createSelector([selectTopicDraft], (draft) =>
  draft ? draft.name || draft.topicKey : null,
);

/** The documents tagged with the open topic, general to specific. Empty for a new topic. */
const selectActiveTopicDocuments = createSelector(
  [selectTopicDraft, knowledgeBaseSelect.topics],
  (draft, topics) => {
    if (!draft || draft.isNew) return [];
    return topics.find((topic) => topic.topicKey === draft.topicKey)?.documents ?? [];
  },
);

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const selectDetailDraftKey = createSelector([selectDetailDraft], (draft) =>
  draft ? deriveDraftDetailKey(draft) : null,
);

/** The head version the draft was opened from, which is what "unsaved changes" is measured against. */
const selectSavedDetail = createSelector(
  [selectDetailDraft, selectDetailDraftKey, topicDetailSelect.headDocsByKey],
  (draft, detailKey, docsByKey) => (draft && !draft.isNew && detailKey ? docsByKey.get(detailKey) : undefined),
);

/** A new draft whose tag set already has a document. Saving would be refused, since it is an edit of that document. */
const selectDetailKeyConflict = createSelector(
  [selectDetailDraft, selectDetailDraftKey, topicDetailSelect.headDocsByKey],
  (draft, detailKey, docsByKey) => draft !== null && draft.isNew && detailKey !== null && docsByKey.has(detailKey),
);

/**
 * True when the document was saved by someone else after this draft was opened. Saving would then be
 * refused, so the form says so before the editor has typed anything they would lose.
 */
const selectDetailIsOutOfDate = createSelector(
  [selectDetailDraft, selectSavedDetail],
  (draft, saved) => draft !== null && !draft.isNew && saved !== undefined && draft.baseVersion !== saved.version,
);

const selectDetailIsDirty = createSelector([selectDetailDraft, selectSavedDetail], (draft, saved) =>
  draft ? isDetailDraftDirty({ draft, saved }) : false,
);

const selectDetailCanSave = createSelector([selectDetailDraft, selectDetailKeyConflict], (draft, keyConflict) =>
  draft ? canSaveDetailDraft({ draft, keyConflict }) : false,
);

const selectDetailActiveName = createSelector([selectDetailDraft], (draft) => (draft ? draft.title : null));

export const topicEditorSelect = {
  topicDraft: selectTopicDraft,
  topicKeyConflict: selectTopicKeyConflict,
  topicKeyError: selectTopicKeyError,
  topicIsDirty: selectTopicIsDirty,
  topicCanSave: selectTopicCanSave,
  topicActiveName: selectTopicActiveName,
  activeTopicDocuments: selectActiveTopicDocuments,
  detailDraft: selectDetailDraft,
  detailDraftVersion: selectDetailDraftVersion,
  detailDraftKey: selectDetailDraftKey,
  detailKeyConflict: selectDetailKeyConflict,
  detailIsOutOfDate: selectDetailIsOutOfDate,
  detailIsDirty: selectDetailIsDirty,
  detailCanSave: selectDetailCanSave,
  detailActiveName: selectDetailActiveName,
};
