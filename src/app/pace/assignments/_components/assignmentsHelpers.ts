import { AppState } from "@/store";



export const selectSelectedEmployeeIds = (state: AppState): string[] =>
  state.pace.assignmentEditorSelectedEmployeeIds;
