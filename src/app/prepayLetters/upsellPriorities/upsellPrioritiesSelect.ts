import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import type { UpsellPriority } from "./upsellPrioritiesTypes";

const selectDocs = (state: AppState) => state.upsellPriorities.docs;
const selectDraft = (state: AppState) => state.upsellPriorities.draft;
const selectCurrentSaId = (state: AppState) => state.auth.user?.saId;

const selectDocMap = createSelector([selectDocs], (docs) =>
  new Grouper(docs).toUniqueMap((d) => d.upsellPrioritiesId),
);

/** Lists with an owner-prefixed display name for lists authored by other users. */
const selectDocsWithDisplayName = createSelector(
  [selectDocs, selectCurrentSaId],
  (docs, currentSaId) =>
    docs.map((doc) => ({
      ...doc,
      displayName: doc.saId === currentSaId ? doc.name : `${doc.saId} - ${doc.name}`,
    })),
);

/** configId-style collisions only happen against the current user's own names. */
const selectOwnNames = createSelector([selectDocs, selectCurrentSaId], (docs, currentSaId) =>
  docs.filter((d) => d.saId === currentSaId).map((d) => d.name),
);

const selectIsDirty = createSelector([selectDraft, selectDocMap], (draft, docMap) => {
  if (!draft) return false;
  const saved = draft.upsellPrioritiesId ? docMap.get(draft.upsellPrioritiesId) : undefined;
  if (!saved) return true;
  return !deepEqual(
    { name: draft.name, priorities: draft.priorities },
    { name: saved.name, priorities: saved.priorities },
  );
});

const selectActiveDisplayName = createSelector(
  [selectDraft, selectCurrentSaId],
  (draft, currentSaId) => {
    if (!draft) return null;
    return !draft.saId || draft.saId === currentSaId ? draft.name : `${draft.saId} - ${draft.name}`;
  },
);

/** Draft priorities with progCodeId and precludedBy resolved to full ProgCodes. */
const selectPriorities = createSelector(
  [selectDraft, progServSelect.progCodeMap],
  (draft, progCodeMap): UpsellPriority[] => {
    if (!draft) return [];
    return draft.priorities.map((priority) => ({
      ...priority,
      progCode: progCodeMap.get(priority.progCodeId) ?? null,
      precludedByProgCodes: priority.precludedBy
        .map((id) => progCodeMap.get(id))
        .filter((progCode): progCode is NonNullable<typeof progCode> => progCode !== undefined),
    }));
  },
);

export const upsellPrioritiesSelect = {
  docs: selectDocs,
  draft: selectDraft,
  docMap: selectDocMap,
  docsWithDisplayName: selectDocsWithDisplayName,
  ownNames: selectOwnNames,
  isDirty: selectIsDirty,
  activeDisplayName: selectActiveDisplayName,
  priorities: selectPriorities,
};
