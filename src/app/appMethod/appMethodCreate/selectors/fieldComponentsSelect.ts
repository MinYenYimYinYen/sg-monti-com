import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { solverSelect } from "./solverSelect";
import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import {
  VolumeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

// Base selector
const selectCreateAppMethodState = (state: AppState) => state.createAppMethod;

// Product Type selector
const selectProductType = (state: AppState) =>
  selectCreateAppMethodState(state).productType;

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
  [
    selectGroundSpeedDistance,
    solverSelect.missingField,
    solverSelect.solveForField,
    solverSelect.solution,
    selectGroundSpeedDistanceUnit,
    selectGroundSpeedTime,
    selectGroundSpeedTimeUnit
  ],
  (stateValue, missingField, solveForField, solution, distanceUnit, time, timeUnit) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "groundSpeed" && missingField?.field === "distance") ||
      (solveForField?.param === "groundSpeed" && solveForField?.field === "distance");

    // If not solving for groundSpeed.distance, return Redux state
    if (!isBeingSolved) {
      return stateValue;
    }

    // If no solution yet, return undefined
    if (!solution?.success) {
      return undefined;
    }

    // Determine target time - use user's value or solution's value
    const targetTime = time ?? solution.result.groundSpeed.time;
    if (targetTime === undefined) {
      return undefined; // Can't calculate without time
    }

    // Convert solver result to user's chosen units
    const baseRate = UnitMath.distanceRate(
      solution.result.groundSpeed.distance,
      solution.result.groundSpeed.distanceUnit,
      solution.result.groundSpeed.time,
      solution.result.groundSpeed.timeUnit
    );

    // Use user's units if set, otherwise fall back to solution's units
    const targetDistanceUnit = distanceUnit || solution.result.groundSpeed.distanceUnit;
    const targetTimeUnit = timeUnit || solution.result.groundSpeed.timeUnit;

    // Calculate distance for user's chosen time/units
    const rateInTargetUnits = baseRate.toDistanceRate(targetDistanceUnit, targetTimeUnit);
    return rateInTargetUnits * targetTime;
  }
);

const selectGroundSpeedDistanceUnitWithSolution = createSelector(
  [selectGroundSpeedDistanceUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "groundSpeed" && missingField?.field === "distance") ||
      (solveForField?.param === "groundSpeed" && solveForField?.field === "distance");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.groundSpeed.distanceUnit;
    }
    return stateValue;
  }
);

const selectGroundSpeedTimeWithSolution = createSelector(
  [selectGroundSpeedTime, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "groundSpeed" && missingField?.field === "time") ||
      (solveForField?.param === "groundSpeed" && solveForField?.field === "time");

    // If solving for groundSpeed.time, show solution
    if (isBeingSolved && solution?.success) {
      return solution.result.groundSpeed.time;
    }
    return stateValue;
  }
);

const selectGroundSpeedTimeUnitWithSolution = createSelector(
  [selectGroundSpeedTimeUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "groundSpeed" && missingField?.field === "time") ||
      (solveForField?.param === "groundSpeed" && solveForField?.field === "time");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.groundSpeed.timeUnit;
    }
    return stateValue;
  }
);

// Pattern Width with solution
const selectPatternWidthDistanceWithSolution = createSelector(
  [
    selectPatternWidthDistance,
    solverSelect.missingField,
    solverSelect.solveForField,
    solverSelect.solution,
    selectPatternWidthDistanceUnit
  ],
  (stateValue, missingField, solveForField, solution, distanceUnit) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "patternWidth" && missingField?.field === "distance") ||
      (solveForField?.param === "patternWidth" && solveForField?.field === "distance");

    // If not solving for patternWidth.distance, return Redux state
    if (!isBeingSolved) {
      return stateValue;
    }

    // If no solution yet, return undefined
    if (!solution?.success) {
      return undefined;
    }

    // Convert solver result to user's chosen units
    const baseDistance = UnitMath.distance(
      solution.result.patternWidth.distance,
      solution.result.patternWidth.distanceUnit
    );

    // Use user's unit if set, otherwise fall back to solution's unit
    const targetUnit = distanceUnit || solution.result.patternWidth.distanceUnit;

    return baseDistance.toDistance(targetUnit);
  }
);

const selectPatternWidthDistanceUnitWithSolution = createSelector(
  [selectPatternWidthDistanceUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "patternWidth" && missingField?.field === "distance") ||
      (solveForField?.param === "patternWidth" && solveForField?.field === "distance");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.patternWidth.distanceUnit;
    }
    return stateValue;
  }
);

// Flow Rate with solution
const selectFlowRateVolumeWithSolution = createSelector(
  [
    selectFlowRateVolume,
    solverSelect.missingField,
    solverSelect.solveForField,
    solverSelect.solution,
    selectFlowRateVolumeUnit,
    selectFlowRateTime,
    selectFlowRateTimeUnit,
    selectProductType,
  ],
  (
    stateValue,
    missingField,
    solveForField,
    solution,
    volumeUnit,
    time,
    timeUnit,
    productType,
  ) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "flowRate" && missingField?.field === "volume") ||
      (solveForField?.param === "flowRate" && solveForField?.field === "volume");

    // If not solving for flowRate.volume, return Redux state
    if (!isBeingSolved) {
      return stateValue;
    }

    // If no solution yet, return undefined
    if (!solution?.success) {
      return undefined;
    }

    // Determine target time - use user's value or solution's value
    const targetTime = time ?? solution.result.flowRate.time;
    if (targetTime === undefined) {
      return undefined; // Can't calculate without time
    }

    // Convert solver result to user's chosen units (conditional on productType)
    const baseRate =
      productType === "liquid"
        ? UnitMath.volumeRate(
            solution.result.flowRate.volume,
            solution.result.flowRate.volumeUnit as VolumeUnit["desc"],
            solution.result.flowRate.time,
            solution.result.flowRate.timeUnit,
          )
        : UnitMath.weightRate(
            solution.result.flowRate.volume,
            solution.result.flowRate.volumeUnit as WeightUnit["desc"],
            solution.result.flowRate.time,
            solution.result.flowRate.timeUnit,
          );

    // Use user's units if set, otherwise fall back to solution's units
    const targetVolumeUnit = volumeUnit || solution.result.flowRate.volumeUnit;
    const targetTimeUnit = timeUnit || solution.result.flowRate.timeUnit;

    // Calculate volume/weight for user's chosen time/units
    const rateInTargetUnits =
      productType === "liquid"
        ? baseRate.toVolumeRate(
            targetVolumeUnit as VolumeUnit["desc"],
            targetTimeUnit,
          )
        : baseRate.toWeightRate(
            targetVolumeUnit as WeightUnit["desc"],
            targetTimeUnit,
          );
    return rateInTargetUnits * targetTime;
  },
);

const selectFlowRateVolumeUnitWithSolution = createSelector(
  [selectFlowRateVolumeUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "flowRate" && missingField?.field === "volume") ||
      (solveForField?.param === "flowRate" && solveForField?.field === "volume");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.flowRate.volumeUnit;
    }
    return stateValue;
  }
);

const selectFlowRateTimeWithSolution = createSelector(
  [selectFlowRateTime, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "flowRate" && missingField?.field === "time") ||
      (solveForField?.param === "flowRate" && solveForField?.field === "time");

    // If solving for flowRate.time, show solution
    if (isBeingSolved && solution?.success) {
      return solution.result.flowRate.time;
    }
    return stateValue;
  }
);

const selectFlowRateTimeUnitWithSolution = createSelector(
  [selectFlowRateTimeUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "flowRate" && missingField?.field === "time") ||
      (solveForField?.param === "flowRate" && solveForField?.field === "time");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.flowRate.timeUnit;
    }
    return stateValue;
  }
);

// Coverage with solution
const selectCoverageVolumeWithSolution = createSelector(
  [
    selectCoverageVolume,
    solverSelect.missingField,
    solverSelect.solveForField,
    solverSelect.solution,
    selectCoverageVolumeUnit,
    selectCoverageArea,
    selectCoverageAreaUnit,
    selectProductType,
  ],
  (
    stateValue,
    missingField,
    solveForField,
    solution,
    volumeUnit,
    area,
    areaUnit,
    productType,
  ) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "coverage" && missingField?.field === "volume") ||
      (solveForField?.param === "coverage" && solveForField?.field === "volume");

    // If not solving for coverage.volume, return Redux state
    if (!isBeingSolved) {
      return stateValue;
    }

    // If no solution yet, return undefined
    if (!solution?.success) {
      return undefined;
    }

    // Determine target area - use user's value or solution's value
    const targetArea = area ?? solution.result.coverage.area;
    if (targetArea === undefined) {
      return undefined; // Can't calculate without area
    }

    // Convert solver result to user's chosen units (conditional on productType)
    const baseRate =
      productType === "liquid"
        ? UnitMath.volumePerArea(
            solution.result.coverage.volume,
            solution.result.coverage.volumeUnit as VolumeUnit["desc"],
            solution.result.coverage.area,
            solution.result.coverage.areaUnit,
          )
        : UnitMath.weightPerArea(
            solution.result.coverage.volume,
            solution.result.coverage.volumeUnit as WeightUnit["desc"],
            solution.result.coverage.area,
            solution.result.coverage.areaUnit,
          );

    // Use user's units if set, otherwise fall back to solution's units
    const targetVolumeUnit = volumeUnit || solution.result.coverage.volumeUnit;
    const targetAreaUnit = areaUnit || solution.result.coverage.areaUnit;

    // Calculate volume/weight for user's chosen area/units
    const rateInTargetUnits =
      productType === "liquid"
        ? baseRate.toVolumePerArea(
            targetVolumeUnit as VolumeUnit["desc"],
            targetAreaUnit,
          )
        : baseRate.toWeightPerArea(
            targetVolumeUnit as WeightUnit["desc"],
            targetAreaUnit,
          );
    return rateInTargetUnits * targetArea;
  },
);

const selectCoverageVolumeUnitWithSolution = createSelector(
  [selectCoverageVolumeUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "coverage" && missingField?.field === "volume") ||
      (solveForField?.param === "coverage" && solveForField?.field === "volume");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
      return solution.result.coverage.volumeUnit;
    }
    return stateValue;
  }
);

const selectCoverageAreaWithSolution = createSelector(
  [selectCoverageArea, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "coverage" && missingField?.field === "area") ||
      (solveForField?.param === "coverage" && solveForField?.field === "area");

    // If solving for coverage.area, show solution
    if (isBeingSolved && solution?.success) {
      return solution.result.coverage.area;
    }
    return stateValue;
  }
);

const selectCoverageAreaUnitWithSolution = createSelector(
  [selectCoverageAreaUnit, solverSelect.missingField, solverSelect.solveForField, solverSelect.solution],
  (stateValue, missingField, solveForField, solution) => {
    // Check if this field is being solved for (either auto-detected or explicitly set)
    const isBeingSolved =
      (missingField?.param === "coverage" && missingField?.field === "area") ||
      (solveForField?.param === "coverage" && solveForField?.field === "area");

    // If being solved and user hasn't set unit, provide default from solution
    if (isBeingSolved && solution?.success && !stateValue) {
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
