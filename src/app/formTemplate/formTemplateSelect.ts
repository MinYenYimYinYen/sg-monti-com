import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectTemplates = (state: AppState) => state.formTemplate.templates;
const selectDraft = (state: AppState) => state.formTemplate.draft;
const selectPreviewScale = (state: AppState) => state.formTemplate.previewScale;
const selectPreviewMode = (state: AppState) => state.formTemplate.previewMode;

const selectTemplateMap = createSelector([selectTemplates], (templates) =>
  new Grouper(templates).toUniqueMap((t) => t.templateId),
);

const selectDraftSlots = createSelector(
  [selectDraft],
  (draft) => draft?.slots ?? [],
);

export const formTemplateSelect = {
  templates: selectTemplates,
  draft: selectDraft,
  draftSlots: selectDraftSlots,
  templateMap: selectTemplateMap,
  previewScale: selectPreviewScale,
  previewMode: selectPreviewMode,
};
