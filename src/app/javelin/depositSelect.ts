import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { sumPlanTotals } from "@/app/javelin/_lib/entryPlanUtils";

const selectDepositState = (state: AppState) => state.deposit;

const selectRows = (state: AppState) => selectDepositState(state).rows;
const selectFileName = (state: AppState) => selectDepositState(state).fileName;
const selectWarnings = (state: AppState) => selectDepositState(state).warnings;
const selectErrors = (state: AppState) => selectDepositState(state).errors;
const selectPlan = (state: AppState) => selectDepositState(state).plan;
const selectConfirmedDocNumbers = (state: AppState) => selectDepositState(state).confirmedDocNumbers;
const selectLastRun = (state: AppState) => selectDepositState(state).lastRun;

const selectPostable = createSelector([selectPlan], sumPlanTotals);

const selectPossibleDuplicates = createSelector([selectPlan], (plan) =>
  plan.filter((entry) => entry.status === "possibleDuplicate"),
);

export const depositSelect = {
  rows: selectRows,
  fileName: selectFileName,
  warnings: selectWarnings,
  errors: selectErrors,
  plan: selectPlan,
  confirmedDocNumbers: selectConfirmedDocNumbers,
  lastRun: selectLastRun,
  postable: selectPostable,
  possibleDuplicates: selectPossibleDuplicates,
};
