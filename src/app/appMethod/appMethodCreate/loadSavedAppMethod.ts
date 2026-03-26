import { AppDispatch } from "@/store";
import { createAppMethodActions } from "./createAppMethodSlice";
import { AppMethod } from "../AppMethodTypes";

/**
 * Load a saved AppMethod into Redux state for viewing/editing
 *
 * @param method - The saved method from MongoDB
 * @param dispatch - Redux dispatch function
 */
export function loadSavedAppMethod(method: AppMethod, dispatch: AppDispatch) {
  // Metadata
  dispatch(createAppMethodActions.setAppMethodId(method.appMethodId));
  dispatch(createAppMethodActions.setDescription(method.description));

  // FlowRate
  dispatch(createAppMethodActions.setFlowRateVolume(method.flowRate.volume));
  dispatch(createAppMethodActions.setFlowRateVolumeUnit(method.flowRate.volumeUnit));
  dispatch(createAppMethodActions.setFlowRateTime(method.flowRate.time));
  dispatch(createAppMethodActions.setFlowRateTimeUnit(method.flowRate.timeUnit));

  // GroundSpeed
  dispatch(createAppMethodActions.setGroundSpeedDistance(method.groundSpeed.distance));
  dispatch(createAppMethodActions.setGroundSpeedDistanceUnit(method.groundSpeed.distanceUnit));
  dispatch(createAppMethodActions.setGroundSpeedTime(method.groundSpeed.time));
  dispatch(createAppMethodActions.setGroundSpeedTimeUnit(method.groundSpeed.timeUnit));

  // PatternWidth
  dispatch(createAppMethodActions.setPatternWidthDistance(method.patternWidth.distance));
  dispatch(createAppMethodActions.setPatternWidthDistanceUnit(method.patternWidth.distanceUnit));

  // Coverage
  dispatch(createAppMethodActions.setCoverageVolume(method.coverage.volume));
  dispatch(createAppMethodActions.setCoverageVolumeUnit(method.coverage.volumeUnit));
  dispatch(createAppMethodActions.setCoverageArea(method.coverage.area));
  dispatch(createAppMethodActions.setCoverageAreaUnit(method.coverage.areaUnit));

  // Overlap
  dispatch(createAppMethodActions.setOverlap(method.overlap));

  // Flags
  dispatch(createAppMethodActions.setNeedsWater(method.needsWater));
  dispatch(createAppMethodActions.setTracksTankLevel(method.tracksTankLevel));

  // When editing existing method, default to solving for coverage.volume
  // This prevents validation mode and allows recalculation when editing parameters
  dispatch(createAppMethodActions.setSolveForField({
    param: "coverage",
    field: "volume",
  }));
}
