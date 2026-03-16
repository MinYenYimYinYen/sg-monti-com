import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store/index";

// Base selector
const selectCreateAppMethodState = (state: AppState) => state.createAppMethod;

// Validation selector
export const selectValidation = createSelector(
  [selectCreateAppMethodState],
  (state) => state.validation
);

// Solver result selector
export const selectSolverResult = createSelector(
  [selectCreateAppMethodState],
  (state) => state.solverResult
);

// Can save derived selector
export const selectCanSave = createSelector(
  [selectCreateAppMethodState, selectSolverResult],
  (state, solverResult) => {
    return Boolean(
      state.appMethodId &&
        state.description &&
        solverResult &&
        solverResult.success
    );
  }
);

export const solverSelect = {
  validation: selectValidation,
  solverResult: selectSolverResult,
  canSave: selectCanSave,
};
