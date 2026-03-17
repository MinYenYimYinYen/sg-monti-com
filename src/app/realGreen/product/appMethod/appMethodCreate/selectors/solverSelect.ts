import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { AppMethodParams, AppMethodSolver, MissingField } from "../../AppMethodSolver";
import { FieldKey } from "../createAppMethodSlice";

const selectOverlap = (state: AppState) => state.createAppMethod.overlap;

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
    const params: AppMethodParams = {
      overlap,
    };

    // Ground Speed - include param if at least units are provided
    if (groundSpeedDistanceUnit !== "" || groundSpeedTimeUnit !== "") {
      params.groundSpeed = {
        distance: groundSpeedDistance === "" ? (undefined as any) : (groundSpeedDistance as number),
        distanceUnit: groundSpeedDistanceUnit,
        time: groundSpeedTime === "" ? (undefined as any) : (groundSpeedTime as number),
        timeUnit: groundSpeedTimeUnit,
      };
    }

    // Pattern Width - include param if at least unit is provided
    if (patternWidthDistanceUnit !== "") {
      params.patternWidth = {
        distance: patternWidthDistance === "" ? (undefined as any) : (patternWidthDistance as number),
        distanceUnit: patternWidthDistanceUnit,
      };
    }

    // Flow Rate - include param if at least units are provided
    if (flowRateVolumeUnit !== "" || flowRateTimeUnit !== "") {
      params.flowRate = {
        volume: flowRateVolume === "" ? (undefined as any) : (flowRateVolume as number),
        volumeUnit: flowRateVolumeUnit,
        time: flowRateTime === "" ? (undefined as any) : (flowRateTime as number),
        timeUnit: flowRateTimeUnit,
      };
    }

    // Coverage - include param if at least units are provided
    if (coverageVolumeUnit !== "" || coverageAreaUnit !== "") {
      params.coverage = {
        volume: coverageVolume === "" ? (undefined as any) : (coverageVolume as number),
        volumeUnit: coverageVolumeUnit,
        area: coverageArea === "" ? (undefined as any) : (coverageArea as number),
        areaUnit: coverageAreaUnit,
      };
    }

    return params;
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
