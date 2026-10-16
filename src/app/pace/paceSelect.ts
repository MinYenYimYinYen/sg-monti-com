import { AppState } from "@/store";

const selectMainDate = (state: AppState) => state.pace.mainDate;
const selectGoalMultiplier = (state: AppState) => state.pace.goalMultiplier;
const selectGoalMultiplierGroupIds = (state: AppState) => state.pace.goalMultiplierGroupIds;
const selectQueuedByDateAndEmployee = (state: AppState) => state.pace.queuedByDateAndEmployee;

export const paceSelect = {
  mainDate: selectMainDate,
  goalMultiplier: selectGoalMultiplier,
  goalMultiplierGroupIds: selectGoalMultiplierGroupIds,
  queuedByDateAndEmployee: selectQueuedByDateAndEmployee,
};
