import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { filterDetailsByTopic } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceLogic";

const selectEditorTab = (state: AppState) => state.knowledgeBaseWorkspace.editorTab;
const selectDetailListScope = (state: AppState) => state.knowledgeBaseWorkspace.detailListScope;

/** The topic that narrows the document list: a saved, open topic while the scope asks for it. Otherwise null. */
const selectDetailListTopicKey = createSelector(
  [selectDetailListScope, topicEditorSelect.topicDraft],
  (scope, topicDraft) => (scope === "openTopic" && topicDraft && !topicDraft.isNew ? topicDraft.topicKey : null),
);

const selectDetailsForList = createSelector(
  [knowledgeBaseSelect.details, selectDetailListTopicKey],
  (details, topicKey) => filterDetailsByTopic({ details, topicKey }),
);

export const knowledgeBaseWorkspaceSelect = {
  editorTab: selectEditorTab,
  detailListScope: selectDetailListScope,
  detailListTopicKey: selectDetailListTopicKey,
  detailsForList: selectDetailsForList,
};
