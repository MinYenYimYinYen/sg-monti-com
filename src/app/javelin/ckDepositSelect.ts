import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { sumPlanTotals } from "@/app/javelin/_lib/entryPlanUtils";
import { summarizeDraftRows } from "@/app/javelin/_lib/ckDepositRows";

const selectCkDepositState = (state: AppState) => state.ckDeposit;

const selectRows = (state: AppState) => selectCkDepositState(state).rows;
const selectPlan = (state: AppState) => selectCkDepositState(state).plan;
const selectConfirmedDocNumbers = (state: AppState) =>
  selectCkDepositState(state).confirmedDocNumbers;
const selectLastRun = (state: AppState) => selectCkDepositState(state).lastRun;

const selectSummary = createSelector([selectRows], summarizeDraftRows);
const selectPostable = createSelector([selectPlan], sumPlanTotals);

export const ckDepositSelect = {
  rows: selectRows,
  plan: selectPlan,
  confirmedDocNumbers: selectConfirmedDocNumbers,
  lastRun: selectLastRun,
  summary: selectSummary,
  postable: selectPostable,
};
