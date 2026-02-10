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

export const handleSetServCodeProductSelection = (
  state: Draft<ProgServState>,
  action: PayloadAction<{
    servCodeId: string;
    productIds: number[];
    type: "master" | "single";
  }>
) => {
  const { servCodeId, productIds, type } = action.payload;
  const index = state.servCodeDocs.findIndex(
    (servCode) => servCode.servCodeId === servCodeId
  );

  if (index === -1) return;

  const servCode = state.servCodeDocs[index];
  
  // Create a new array from the existing proxy to avoid mutating the original directly yet
  let newProductDocs = [...servCode.productDocs];

  // 1. Identify current IDs for this type
  const currentIds = newProductDocs.flatMap((doc) =>
    type === "master" ? doc.productMasterIds : doc.productSingleIds
  );

  // 2. Find removed IDs
  const removedIds = currentIds.filter((id) => !productIds.includes(id));

  // 3. Remove docs for removed IDs
  if (removedIds.length > 0) {
    newProductDocs = newProductDocs.filter((doc) => {
      const idsToCheck =
        type === "master" ? doc.productMasterIds : doc.productSingleIds;
      // Keep doc if it doesn't contain any of the removed IDs
      // (Assuming 1:1 mapping as per current logic, but safe to check 'some')
      return !idsToCheck.some((id) => removedIds.includes(id));
    });
  }

  // 4. Find added IDs
  const addedIds = productIds.filter((id) => !currentIds.includes(id));

  // 5. Add new docs for added IDs
  addedIds.forEach((id) => {
    const newDoc: ServCodeProductDoc = {
      size: 0,
      sizeOperator: "all",
      productMasterIds: type === "master" ? [id] : [],
      productSingleIds: type === "single" ? [id] : [],
    };
    newProductDocs.push(newDoc);
  });

  // 6. Update state using the same logic as handleUpdateServCode
  // We inline it here to ensure it works correctly within this reducer scope
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
    productDocs: newProductDocs,
  };

  state.servCodeDocs[index] = unsavedChanges.updated;
};
