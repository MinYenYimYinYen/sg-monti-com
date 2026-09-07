import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.seasonIncreases.docs;

const selectActiveDoc = createSelector([selectDocs], (docs) =>
  docs.find((d) => d.isActive) ?? null,
);

export const seasonIncreasesSelect = {
  docs: selectDocs,
  activeDoc: selectActiveDoc,
};
