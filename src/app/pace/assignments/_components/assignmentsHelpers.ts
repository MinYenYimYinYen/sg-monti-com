import { AppState } from "@/store";

export function formatGoal(goal: number | null): string {
  if (goal === null) return "";
  return String(Math.round(goal));
}

export const selectSelectedEmployeeIds = (state: AppState): string[] =>
  state.pace.assignmentEditorSelectedEmployeeIds;
