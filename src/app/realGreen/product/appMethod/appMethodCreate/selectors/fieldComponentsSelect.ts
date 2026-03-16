import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { solverSelect } from "./solverSelect";

// Base selector
const selectCreateAppMethodState = (state: AppState) => state.createAppMethod;

// Ground Speed selectors - direct state access (no memoization needed)
export const selectGroundSpeedDistance = (state: AppState) =>
  selectCreateAppMethodState(state).groundSpeedDistance;

export const selectGroundSpeedDistanceUnit = (state: AppState) =>
  selectCreateAppMethodState(state).groundSpeedDistanceUnit;

export const selectGroundSpeedTime = (state: AppState) =>
  selectCreateAppMethodState(state).groundSpeedTime;

export const selectGroundSpeedTimeUnit = (state: AppState) =>
  selectCreateAppMethodState(state).groundSpeedTimeUnit;

// Pattern Width selectors - direct state access
export const selectPatternWidthDistance = (state: AppState) =>
  selectCreateAppMethodState(state).patternWidthDistance;

export const selectPatternWidthDistanceUnit = (state: AppState) =>
  selectCreateAppMethodState(state).patternWidthDistanceUnit;

// Flow Rate selectors - direct state access
export const selectFlowRateVolume = (state: AppState) =>
  selectCreateAppMethodState(state).flowRateVolume;

export const selectFlowRateVolumeUnit = (state: AppState) =>
  selectCreateAppMethodState(state).flowRateVolumeUnit;

export const selectFlowRateTime = (state: AppState) =>
  selectCreateAppMethodState(state).flowRateTime;

export const selectFlowRateTimeUnit = (state: AppState) =>
  selectCreateAppMethodState(state).flowRateTimeUnit;

// Coverage selectors - direct state access
export const selectCoverageVolume = (state: AppState) =>
  selectCreateAppMethodState(state).coverageVolume;

export const selectCoverageVolumeUnit = (state: AppState) =>
  selectCreateAppMethodState(state).coverageVolumeUnit;

export const selectCoverageArea = (state: AppState) =>
  selectCreateAppMethodState(state).coverageArea;

export const selectCoverageAreaUnit = (state: AppState) =>
  selectCreateAppMethodState(state).coverageAreaUnit;

// Merged selectors - combine Redux state with solver results
// Ground Speed with solution
const selectGroundSpeedDistanceWithSolution = createSelector(
  [selectGroundSpeedDistance, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "groundSpeed" && solution?.success) {
      return solution.result.groundSpeed.distance;
    }
    return stateValue;
  }
);

const selectGroundSpeedDistanceUnitWithSolution = createSelector(
  [selectGroundSpeedDistanceUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "groundSpeed" && solution?.success) {
      return solution.result.groundSpeed.distanceUnit;
    }
    return stateValue;
  }
);

const selectGroundSpeedTimeWithSolution = createSelector(
  [selectGroundSpeedTime, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "groundSpeed" && solution?.success) {
      return solution.result.groundSpeed.time;
    }
    return stateValue;
  }
);

const selectGroundSpeedTimeUnitWithSolution = createSelector(
  [selectGroundSpeedTimeUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "groundSpeed" && solution?.success) {
      return solution.result.groundSpeed.timeUnit;
    }
    return stateValue;
  }
);

// Pattern Width with solution
const selectPatternWidthDistanceWithSolution = createSelector(
  [selectPatternWidthDistance, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "patternWidth" && solution?.success) {
      return solution.result.patternWidth.distance;
    }
    return stateValue;
  }
);

const selectPatternWidthDistanceUnitWithSolution = createSelector(
  [selectPatternWidthDistanceUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "patternWidth" && solution?.success) {
      return solution.result.patternWidth.distanceUnit;
    }
    return stateValue;
  }
);

// Flow Rate with solution
const selectFlowRateVolumeWithSolution = createSelector(
  [selectFlowRateVolume, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "flowRate" && solution?.success) {
      return solution.result.flowRate.volume;
    }
    return stateValue;
  }
);

const selectFlowRateVolumeUnitWithSolution = createSelector(
  [selectFlowRateVolumeUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "flowRate" && solution?.success) {
      return solution.result.flowRate.volumeUnit;
    }
    return stateValue;
  }
);

const selectFlowRateTimeWithSolution = createSelector(
  [selectFlowRateTime, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "flowRate" && solution?.success) {
      return solution.result.flowRate.time;
    }
    return stateValue;
  }
);

const selectFlowRateTimeUnitWithSolution = createSelector(
  [selectFlowRateTimeUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "flowRate" && solution?.success) {
      return solution.result.flowRate.timeUnit;
    }
    return stateValue;
  }
);

// Coverage with solution
const selectCoverageVolumeWithSolution = createSelector(
  [selectCoverageVolume, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "coverage" && solution?.success) {
      return solution.result.coverage.volume;
    }
    return stateValue;
  }
);

const selectCoverageVolumeUnitWithSolution = createSelector(
  [selectCoverageVolumeUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "coverage" && solution?.success) {
      return solution.result.coverage.volumeUnit;
    }
    return stateValue;
  }
);

const selectCoverageAreaWithSolution = createSelector(
  [selectCoverageArea, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "coverage" && solution?.success) {
      return solution.result.coverage.area;
    }
    return stateValue;
  }
);

const selectCoverageAreaUnitWithSolution = createSelector(
  [selectCoverageAreaUnit, solverSelect.solveForField, solverSelect.solution],
  (stateValue, solveForField, solution) => {
    if (solveForField === "coverage" && solution?.success) {
      return solution.result.coverage.areaUnit;
    }
    return stateValue;
  }
);

// Organized export
export const fieldComponentsSelect = {
  // Ground Speed
  groundSpeed: {
    distance: selectGroundSpeedDistanceWithSolution,
    distanceUnit: selectGroundSpeedDistanceUnitWithSolution,
    time: selectGroundSpeedTimeWithSolution,
    timeUnit: selectGroundSpeedTimeUnitWithSolution,
  },
  // Pattern Width
  patternWidth: {
    distance: selectPatternWidthDistanceWithSolution,
    distanceUnit: selectPatternWidthDistanceUnitWithSolution,
  },
  // Flow Rate
  flowRate: {
    volume: selectFlowRateVolumeWithSolution,
    volumeUnit: selectFlowRateVolumeUnitWithSolution,
    time: selectFlowRateTimeWithSolution,
    timeUnit: selectFlowRateTimeUnitWithSolution,
  },
  // Coverage
  coverage: {
    volume: selectCoverageVolumeWithSolution,
    volumeUnit: selectCoverageVolumeUnitWithSolution,
    area: selectCoverageAreaWithSolution,
    areaUnit: selectCoverageAreaUnitWithSolution,
  },
};
