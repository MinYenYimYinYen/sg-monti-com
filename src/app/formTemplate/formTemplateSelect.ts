import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { authSelect } from "@/app/auth/authSlice";
import type { FormTemplateDoc } from "./FormTemplateTypes";

const selectTemplates = (state: AppState) => state.formTemplate.templates;
const selectCurrentSaId = (state: AppState) => authSelect.user(state)?.saId;
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
  const saved = draft.templateId ? templateMap.get(draft.templateId) : undefined;
  if (!saved) return true; // new template, never saved
  return !deepEqual(draft, saved);
});

/** Templates authored by the current user. */
const selectOwnTemplates = createSelector(
  [selectTemplates, selectCurrentSaId],
  (templates, currentSaId) => templates.filter((t) => !!currentSaId && t.saId === currentSaId),
);

/** Names of the current user's templates. templateId derives from name + saId, so only these can collide. */
const selectExistingNames = createSelector([selectOwnTemplates], (templates) =>
  templates.map((t) => t.templateName),
);

/** Prefixes the owner's saId onto templates that belong to someone else (or to nobody). */
function displayNameFor({ template, currentSaId }: { template: FormTemplateDoc; currentSaId?: string }) {
  if (!template.saId) return `(unowned) ${template.templateName}`;
  return template.saId === currentSaId
    ? template.templateName
    : `${template.saId} - ${template.templateName}`;
}

const selectTemplatesWithDisplayName = createSelector(
  [selectTemplates, selectCurrentSaId],
  (templates, currentSaId) =>
    templates.map((template) => ({
      ...template,
      displayName: displayNameFor({ template, currentSaId }),
    })),
);

/** Draft name for the header; null when there is no draft. A blank draft shows as empty. */
const selectActiveDisplayName = createSelector(
  [selectDraft, selectCurrentSaId],
  (draft, currentSaId) => {
    if (!draft) return null;
    // Never-saved drafts belong to the current user even though templateId is empty.
    if (!draft.templateId) return draft.templateName;
    return displayNameFor({ template: draft, currentSaId });
  },
);

export const formTemplateSelect = {
  templates: selectTemplates,
  draft: selectDraft,
  draftSlots: selectDraftSlots,
  draftSlotEdges: selectDraftSlotEdges,
  templateMap: selectTemplateMap,
  previewScale: selectPreviewScale,
  previewMode: selectPreviewMode,
  isDirty: selectIsDirty,
  ownTemplates: selectOwnTemplates,
  existingNames: selectExistingNames,
  templatesWithDisplayName: selectTemplatesWithDisplayName,
  activeDisplayName: selectActiveDisplayName,
};
