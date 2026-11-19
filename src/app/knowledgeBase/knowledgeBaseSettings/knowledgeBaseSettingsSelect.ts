import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import type {
  KnowledgeBaseSettingDoc,
  KnowledgeBaseSettingDocOf,
} from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

const NO_APPROVER_USER_NAMES: string[] = [];

const selectDocs = (state: AppState) => state.knowledgeBaseSettings.docs;
const selectApproverCandidates = (state: AppState) => state.knowledgeBaseSettings.approverCandidates;

function isApproversDoc(doc: KnowledgeBaseSettingDoc): doc is KnowledgeBaseSettingDocOf<"approvers"> {
  return doc.settingKey === "approvers";
}

function isAskAwayPromptDoc(doc: KnowledgeBaseSettingDoc): doc is KnowledgeBaseSettingDocOf<"askAwayPrompt"> {
  return doc.settingKey === "askAwayPrompt";
}

/** The server sends one doc per registered setting, so any docs at all means the load has finished. */
const selectIsLoaded = createSelector([selectDocs], (docs) => docs.length > 0);

const selectApproversDoc = createSelector([selectDocs], (docs) => docs.find(isApproversDoc) ?? null);

const selectAskAwayPromptDoc = createSelector([selectDocs], (docs) => docs.find(isAskAwayPromptDoc) ?? null);

const selectApproverUserNames = createSelector(
  [selectApproversDoc],
  (doc) => doc?.value.approverUserNames ?? NO_APPROVER_USER_NAMES,
);

/** null until the settings load, so a prompt is never built from a guess. */
const selectAskAwayPromptTemplate = createSelector([selectAskAwayPromptDoc], (doc) => doc?.value.template ?? null);

export const knowledgeBaseSettingsSelect = {
  docs: selectDocs,
  isLoaded: selectIsLoaded,
  approversDoc: selectApproversDoc,
  askAwayPromptDoc: selectAskAwayPromptDoc,
  approverUserNames: selectApproverUserNames,
  askAwayPromptTemplate: selectAskAwayPromptTemplate,
  approverCandidates: selectApproverCandidates,
};
