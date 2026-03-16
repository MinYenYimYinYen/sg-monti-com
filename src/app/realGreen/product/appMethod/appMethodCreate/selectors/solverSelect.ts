import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { AppMethodParams, AppMethodSolver } from "../../AppMethodSolver";
import { FieldKey } from "../FieldSelector";

const selectOverlap = (state: AppState) => state.createAppMethod.overlap;

const selectAppMethodId = (state: AppState) =>
  state.createAppMethod.appMethodId;
const selectDescription = (state: AppState) =>
  state.createAppMethod.description;


const selectSelectedFields = (state: AppState) =>
  state.createAppMethod.selectedFields;
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

    // Ground Speed
    if (
      groundSpeedDistance !== "" &&
      groundSpeedDistanceUnit !== "" &&
      groundSpeedTime !== "" &&
      groundSpeedTimeUnit !== ""
    ) {
      params.groundSpeed = {
        distance: groundSpeedDistance as number,
        distanceUnit: groundSpeedDistanceUnit,
        time: groundSpeedTime as number,
        timeUnit: groundSpeedTimeUnit,
      };
    }

    // Pattern Width
    if (patternWidthDistance !== "" && patternWidthDistanceUnit !== "") {
      params.patternWidth = {
        distance: patternWidthDistance as number,
        distanceUnit: patternWidthDistanceUnit,
      };
    }

    // Flow Rate
    if (
      flowRateVolume !== "" &&
      flowRateVolumeUnit !== "" &&
      flowRateTime !== "" &&
      flowRateTimeUnit !== ""
    ) {
      params.flowRate = {
        volume: flowRateVolume as number,
        volumeUnit: flowRateVolumeUnit,
        time: flowRateTime as number,
        timeUnit: flowRateTimeUnit,
      };
    }

    // Coverage
    if (
      coverageVolume !== "" &&
      coverageVolumeUnit !== "" &&
      coverageArea !== "" &&
      coverageAreaUnit !== ""
    ) {
      params.coverage = {
        volume: coverageVolume as number,
        volumeUnit: coverageVolumeUnit,
        area: coverageArea as number,
        areaUnit: coverageAreaUnit,
      };
    }

    return params;
  },
);

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

    return allFields.find((field) => !selectedFields.includes(field)) ?? null;
  },
);


const selectValidation = createSelector([selectParams], (params) =>
  AppMethodSolver.validate(params),
);

const selectSolution = createSelector(
  [selectParams, selectSolveForField],
  (params, solveForField) => {
    console.log("selectSolution", params, solveForField);
    if (!solveForField) return null;
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
  solveForField: selectSolveForField,
  validation: selectValidation,
  solution: selectSolution,
  appMethodId: selectAppMethodId,
  description: selectDescription,
  canSave: selectCanSave,
  selectedFields: selectSelectedFields,
};
