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

export type SlotEdges = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

/** Maps each slot's slotId to its edge positions (in inches) for snap alignment. */
const selectDraftSlotEdges = createSelector([selectDraftSlots], (slots) => {
  const map = new Map<string, SlotEdges>();
  for (const slot of slots) {
    map.set(slot.slotId, {
      left: slot.x,
      right: slot.x + slot.width,
      top: slot.y,
      bottom: slot.y + slot.height,
      centerX: slot.x + slot.width / 2,
      centerY: slot.y + slot.height / 2,
    });
  }
  return map;
});

/** True when the draft differs from the last saved version (or is a new unsaved template). */
const selectIsDirty = createSelector([selectDraft, selectTemplateMap], (draft, templateMap) => {
  if (!draft) return false;
  const saved = templateMap.get(draft.templateId);
  if (!saved) return true; // new template, never saved
  return JSON.stringify(draft) !== JSON.stringify(saved);
});

export const formTemplateSelect = {
  templates: selectTemplates,
  draft: selectDraft,
  draftSlots: selectDraftSlots,
  draftSlotEdges: selectDraftSlotEdges,
  templateMap: selectTemplateMap,
  previewScale: selectPreviewScale,
  previewMode: selectPreviewMode,
  isDirty: selectIsDirty,
};
