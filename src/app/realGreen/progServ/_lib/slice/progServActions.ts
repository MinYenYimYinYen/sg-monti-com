import { Draft, PayloadAction } from "@reduxjs/toolkit";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgServState } from "@/app/realGreen/progServ/_lib/types/ProgServState";
import { ServCodeProductDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeProduct";

export const handleUpdateServCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<Partial<ServCodeDoc>>
) => {
  const { servCodeId, ...changes } = action.payload;
  if (!servCodeId) return;

  const index = state.servCodeDocs.findIndex(
    (servCode) => servCode.servCodeId === servCodeId
  );

  if (index !== -1) {
    let unsavedChanges = state.unsavedServCodeChanges.find(
      (change) => change.updated.servCodeId === servCodeId
    );

    if (!unsavedChanges) {
      unsavedChanges = {
        original: { ...state.servCodeDocs[index] },
        updated: { ...state.servCodeDocs[index] },
      };
      state.unsavedServCodeChanges.push(unsavedChanges);
    }

    unsavedChanges.updated = {
      ...unsavedChanges.updated,
      ...changes,
    };

    state.servCodeDocs[index] = unsavedChanges.updated;
  }
};

export const handleRevertServCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ servCodeId: string }>
) => {
  const { servCodeId } = action.payload;
  const changeIndex = state.unsavedServCodeChanges.findIndex(
    (c) => c.updated.servCodeId === servCodeId
  );

  if (changeIndex !== -1) {
    const change = state.unsavedServCodeChanges[changeIndex];

    // 1. Find the document in the main list
    const docIndex = state.servCodeDocs.findIndex(
      (d) => d.servCodeId === servCodeId
    );

    // 2. Restore original state if doc exists
    if (docIndex !== -1) {
      state.servCodeDocs[docIndex] = change.original;
    }

    // 3. Remove from unsaved changes
    state.unsavedServCodeChanges.splice(changeIndex, 1);
  }
};
