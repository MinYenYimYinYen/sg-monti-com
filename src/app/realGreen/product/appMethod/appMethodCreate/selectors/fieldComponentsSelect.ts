import { AppState } from "@/store";

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
