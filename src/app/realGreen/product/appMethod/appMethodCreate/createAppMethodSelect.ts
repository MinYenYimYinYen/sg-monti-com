import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store/index";
import { AppMethodSolver, AppMethodParams } from "../AppMethodSolver";
import { FieldKey } from "./FieldSelector";

// Base selector
const selectCreateAppMethodState = (state: AppState) => state.createAppMethod;

// Simple selectors
const selectAppMethodId = createSelector(
  [selectCreateAppMethodState],
  (state) => state.appMethodId
);

const selectDescription = createSelector(
  [selectCreateAppMethodState],
  (state) => state.description
);

const selectSelectedFields = createSelector(
  [selectCreateAppMethodState],
  (state) => state.selectedFields
);

const selectOverlap = createSelector(
  [selectCreateAppMethodState],
  (state) => state.overlap
);

/**
 * Build AppMethodParams from individual primitive properties
 */
const selectParams = createSelector(
  [selectCreateAppMethodState],
  (state): AppMethodParams => {
    const params: AppMethodParams = {
      overlap: state.overlap,
    };

    // Ground Speed
    if (
      state.groundSpeedDistance !== "" &&
      state.groundSpeedDistanceUnit !== "" &&
      state.groundSpeedTime !== "" &&
      state.groundSpeedTimeUnit !== ""
    ) {
      params.groundSpeed = {
        distance: state.groundSpeedDistance as number,
        distanceUnit: state.groundSpeedDistanceUnit,
        time: state.groundSpeedTime as number,
        timeUnit: state.groundSpeedTimeUnit,
      };
    }

    // Pattern Width
    if (
      state.patternWidthDistance !== "" &&
      state.patternWidthDistanceUnit !== ""
    ) {
      params.patternWidth = {
        distance: state.patternWidthDistance as number,
        distanceUnit: state.patternWidthDistanceUnit,
      };
    }

    // Flow Rate
    if (
      state.flowRateVolume !== "" &&
      state.flowRateVolumeUnit !== "" &&
      state.flowRateTime !== "" &&
      state.flowRateTimeUnit !== ""
    ) {
      params.flowRate = {
        volume: state.flowRateVolume as number,
        volumeUnit: state.flowRateVolumeUnit,
        time: state.flowRateTime as number,
        timeUnit: state.flowRateTimeUnit,
      };
    }

    // Coverage
    if (
      state.coverageVolume !== "" &&
      state.coverageVolumeUnit !== "" &&
      state.coverageArea !== "" &&
      state.coverageAreaUnit !== ""
    ) {
      params.coverage = {
        volume: state.coverageVolume as number,
        volumeUnit: state.coverageVolumeUnit,
        area: state.coverageArea as number,
        areaUnit: state.coverageAreaUnit,
      };
    }

    return params;
  }
);

// Derived selectors

/**
 * Which field will be solved for (the one not selected)
 */
const selectSolveForField = createSelector(
  [selectSelectedFields],
  (selectedFields): FieldKey | null => {
    if (selectedFields.length !== 3) return null;

    const allFields: FieldKey[] = [
      "groundSpeed",
      "patternWidth",
      "flowRate",
      "coverage",
    ];

    return (
      allFields.find((field) => !selectedFields.includes(field)) ?? null
    );
  }
);

/**
 * Validation result from the solver
 */
const selectValidation = createSelector([selectParams], (params) => {
  return AppMethodSolver.validate(params);
});

/**
 * Solver result (if validation passes and we can solve)
 */
const selectSolverResult = createSelector(
  [selectParams, selectValidation],
  (params, validation) => {
    if (validation.canSolve || validation.canValidate) {
      return AppMethodSolver.solve(params);
    }
    return null;
  }
);

/**
 * Whether the form is ready to save
 */
const selectCanSave = createSelector(
  [selectAppMethodId, selectDescription, selectSolverResult],
  (appMethodId, description, solverResult) => {
    return Boolean(
      appMethodId && description && solverResult && solverResult.success
    );
  }
);

export const createAppMethodSelect = {
  appMethodId: selectAppMethodId,
  description: selectDescription,
  selectedFields: selectSelectedFields,
  params: selectParams,
  overlap: selectOverlap,
  solveForField: selectSolveForField,
  validation: selectValidation,
  solverResult: selectSolverResult,
  canSave: selectCanSave,
};
