import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store/index";

// Base selector
const selectCreateAppMethodState = (state: AppState) => state.createAppMethod;

// Ground Speed selectors
export const selectGroundSpeedDistance = createSelector(
  [selectCreateAppMethodState],
  (state) => state.groundSpeedDistance
);

export const selectGroundSpeedDistanceUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.groundSpeedDistanceUnit
);

export const selectGroundSpeedTime = createSelector(
  [selectCreateAppMethodState],
  (state) => state.groundSpeedTime
);

export const selectGroundSpeedTimeUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.groundSpeedTimeUnit
);

// Pattern Width selectors
export const selectPatternWidthDistance = createSelector(
  [selectCreateAppMethodState],
  (state) => state.patternWidthDistance
);

export const selectPatternWidthDistanceUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.patternWidthDistanceUnit
);

// Flow Rate selectors
export const selectFlowRateVolume = createSelector(
  [selectCreateAppMethodState],
  (state) => state.flowRateVolume
);

export const selectFlowRateVolumeUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.flowRateVolumeUnit
);

export const selectFlowRateTime = createSelector(
  [selectCreateAppMethodState],
  (state) => state.flowRateTime
);

export const selectFlowRateTimeUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.flowRateTimeUnit
);

// Coverage selectors
export const selectCoverageVolume = createSelector(
  [selectCreateAppMethodState],
  (state) => state.coverageVolume
);

export const selectCoverageVolumeUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.coverageVolumeUnit
);

export const selectCoverageArea = createSelector(
  [selectCreateAppMethodState],
  (state) => state.coverageArea
);

export const selectCoverageAreaUnit = createSelector(
  [selectCreateAppMethodState],
  (state) => state.coverageAreaUnit
);

// Organized export
export const fieldComponentsSelect = {
  // Ground Speed
  groundSpeed: {
    distance: selectGroundSpeedDistance,
    distanceUnit: selectGroundSpeedDistanceUnit,
    time: selectGroundSpeedTime,
    timeUnit: selectGroundSpeedTimeUnit,
  },
  // Pattern Width
  patternWidth: {
    distance: selectPatternWidthDistance,
    distanceUnit: selectPatternWidthDistanceUnit,
  },
  // Flow Rate
  flowRate: {
    volume: selectFlowRateVolume,
    volumeUnit: selectFlowRateVolumeUnit,
    time: selectFlowRateTime,
    timeUnit: selectFlowRateTimeUnit,
  },
  // Coverage
  coverage: {
    volume: selectCoverageVolume,
    volumeUnit: selectCoverageVolumeUnit,
    area: selectCoverageArea,
    areaUnit: selectCoverageAreaUnit,
  },
};
