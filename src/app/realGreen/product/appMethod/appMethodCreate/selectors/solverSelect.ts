import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { AppMethodParams, AppMethodSolver, MissingField } from "../../appMethodSolver/AppMethodSolver";
import { FieldKey } from "../createAppMethodSlice";

const selectOverlap = (state: AppState) => state.createAppMethod.overlap;
const selectProductType = (state: AppState) => state.createAppMethod.productType;

const selectAppMethodId = (state: AppState) =>
  state.createAppMethod.appMethodId;
const selectDescription = (state: AppState) =>
  state.createAppMethod.description;
// Individual field property selectors for selectParams dependencies
const selectGroundSpeedDistance = (state: AppState) =>
  state.createAppMethod.groundSpeedDistance;
const selectGroundSpeedDistanceUnit = (state: AppState) =>
  state.createAppMethod.groundSpeedDistanceUnit;
const selectGroundSpeedTime = (state: AppState) =>
  state.createAppMethod.groundSpeedTime;
const selectGroundSpeedTimeUnit = (state: AppState) =>
  state.createAppMethod.groundSpeedTimeUnit;

const selectPatternWidthDistance = (state: AppState) =>
  state.createAppMethod.patternWidthDistance;
const selectPatternWidthDistanceUnit = (state: AppState) =>
  state.createAppMethod.patternWidthDistanceUnit;

const selectFlowRateVolume = (state: AppState) =>
  state.createAppMethod.flowRateVolume;
const selectFlowRateVolumeUnit = (state: AppState) =>
  state.createAppMethod.flowRateVolumeUnit;
const selectFlowRateTime = (state: AppState) =>
  state.createAppMethod.flowRateTime;
const selectFlowRateTimeUnit = (state: AppState) =>
  state.createAppMethod.flowRateTimeUnit;

const selectCoverageVolume = (state: AppState) =>
  state.createAppMethod.coverageVolume;
const selectCoverageVolumeUnit = (state: AppState) =>
  state.createAppMethod.coverageVolumeUnit;
const selectCoverageArea = (state: AppState) =>
  state.createAppMethod.coverageArea;
const selectCoverageAreaUnit = (state: AppState) =>
  state.createAppMethod.coverageAreaUnit;

// Derived selectors - these use createSelector for memoization

/**
 * Build AppMethodParams from individual primitive properties
 */
const selectParams = createSelector(
  [
    selectOverlap,
    selectProductType,
    selectGroundSpeedDistance,
    selectGroundSpeedDistanceUnit,
    selectGroundSpeedTime,
    selectGroundSpeedTimeUnit,
    selectPatternWidthDistance,
    selectPatternWidthDistanceUnit,
    selectFlowRateVolume,
    selectFlowRateVolumeUnit,
    selectFlowRateTime,
    selectFlowRateTimeUnit,
    selectCoverageVolume,
    selectCoverageVolumeUnit,
    selectCoverageArea,
    selectCoverageAreaUnit,
  ],
  (
    overlap,
    productType,
    groundSpeedDistance,
    groundSpeedDistanceUnit,
    groundSpeedTime,
    groundSpeedTimeUnit,
    patternWidthDistance,
    patternWidthDistanceUnit,
    flowRateVolume,
    flowRateVolumeUnit,
    flowRateTime,
    flowRateTimeUnit,
    coverageVolume,
    coverageVolumeUnit,
    coverageArea,
    coverageAreaUnit,
  ): AppMethodParams => {
    // Always include all fields, numeric values can be undefined
    return {
      overlap,
      productType,
      groundSpeed: {
        distance: groundSpeedDistance,
        distanceUnit: groundSpeedDistanceUnit,
        time: groundSpeedTime,
        timeUnit: groundSpeedTimeUnit,
      },
      patternWidth: {
        distance: patternWidthDistance,
        distanceUnit: patternWidthDistanceUnit,
      },
      flowRate: {
        volume: flowRateVolume,
        volumeUnit: flowRateVolumeUnit,
        time: flowRateTime,
        timeUnit: flowRateTimeUnit,
      },
      coverage: {
        volume: coverageVolume,
        volumeUnit: coverageVolumeUnit,
        area: coverageArea,
        areaUnit: coverageAreaUnit,
      },
    };
  },
);

const selectValidation = createSelector([selectParams], (params) =>
  AppMethodSolver.validate(params),
);

/**
 * Auto-detect which field is missing (if solvable)
 */
const selectMissingField = createSelector(
  [selectValidation],
  (validation): MissingField | null => {
    return validation.readyToSolveFor || null;
  },
);

const selectSolution = createSelector(
  [selectParams],
  (params) => {
    console.log("selectSolution", params);
    const solution =  AppMethodSolver.solve(params);
    console.log("solution", solution);
    return solution;
  },
);
const selectCanSave = createSelector(
  [selectAppMethodId, selectDescription, selectSolution],
  (appMethodId, description, solution) => {
    return Boolean(appMethodId && description && solution && solution.success);
  },
);




export const solverSelect = {
  params: selectParams,
  overlap: selectOverlap,
  missingField: selectMissingField,
  validation: selectValidation,
  solution: selectSolution,
  appMethodId: selectAppMethodId,
  description: selectDescription,
  canSave: selectCanSave,
};
