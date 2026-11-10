import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { sumPlanTotals } from "@/app/javelin/_lib/entryPlanUtils";

const selectJavelinState = (state: AppState) => state.javelin;

const selectFiles = (state: AppState) => selectJavelinState(state).files;
const selectPlan = (state: AppState) => selectJavelinState(state).plan;
const selectConfirmedDocNumbers = (state: AppState) => selectJavelinState(state).confirmedDocNumbers;
const selectLastRun = (state: AppState) => selectJavelinState(state).lastRun;
const selectLatest = (state: AppState) => selectJavelinState(state).latest;

const selectPostable = createSelector([selectPlan], sumPlanTotals);

const selectPossibleDuplicates = createSelector([selectPlan], (plan) =>
  plan.filter((entry) => entry.status === "possibleDuplicate"),
);

export const javelinSelect = {
  files: selectFiles,
  plan: selectPlan,
  confirmedDocNumbers: selectConfirmedDocNumbers,
  lastRun: selectLastRun,
  latest: selectLatest,
  postable: selectPostable,
  possibleDuplicates: selectPossibleDuplicates,
};
