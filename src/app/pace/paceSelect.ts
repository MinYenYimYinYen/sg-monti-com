import { AppState } from "@/store";

const selectMainDate = (state: AppState) => state.pace.mainDate;

export const paceSelect = {
  mainDate: selectMainDate,
}