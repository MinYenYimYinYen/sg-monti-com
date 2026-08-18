import { AppState } from "@/store";

const selectLastImportedDate = (state: AppState) => state.timeCard.lastImportedDate;

export const timeCardSelect = {
  lastImportedDate: selectLastImportedDate,
};
