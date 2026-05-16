import { AppState } from "@/store";

const checkedServIds = (state: AppState): number[] =>
  state.urgent.checkedServIds;

const expandedServCodeIds = (state: AppState): string[] =>
  state.urgent.expandedServCodeIds;

export const urgentSelect = {
  checkedServIds,
  expandedServCodeIds,
};
