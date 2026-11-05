import { AppState } from "@/store";

const selectPreview = (state: AppState) => state.importPost.preview;
const selectLastResults = (state: AppState) => state.importPost.lastResults;

export const importPostSelect = {
  preview: selectPreview,
  lastResults: selectLastResults,
};
