import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/index";
import { createAppMethodActions } from "./createAppMethodSlice";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

/**
 * Hook for updating form field values
 * Provides granular setters for all field properties
 */
export function useFormFieldValues() {
  const dispatch = useDispatch<AppDispatch>();

  return {
    // Metadata
    setAppMethodId: (value: string) => {
      dispatch(createAppMethodActions.setAppMethodId(value));
    },

    setDescription: (value: string) => {
      dispatch(createAppMethodActions.setDescription(value));
    },

    // Ground Speed
    setGroundSpeedDistance: (value: number | "") => {
      dispatch(createAppMethodActions.setGroundSpeedDistance(value));
    },

    setGroundSpeedDistanceUnit: (value: LengthUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setGroundSpeedDistanceUnit(value));
    },

    setGroundSpeedTime: (value: number | "") => {
      dispatch(createAppMethodActions.setGroundSpeedTime(value));
    },

    setGroundSpeedTimeUnit: (value: TimeUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setGroundSpeedTimeUnit(value));
    },

    // Pattern Width
    setPatternWidthDistance: (value: number | "") => {
      dispatch(createAppMethodActions.setPatternWidthDistance(value));
    },

    setPatternWidthDistanceUnit: (value: LengthUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setPatternWidthDistanceUnit(value));
    },

    // Flow Rate
    setFlowRateVolume: (value: number | "") => {
      dispatch(createAppMethodActions.setFlowRateVolume(value));
    },

    setFlowRateVolumeUnit: (value: VolumeUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setFlowRateVolumeUnit(value));
    },

    setFlowRateTime: (value: number | "") => {
      dispatch(createAppMethodActions.setFlowRateTime(value));
    },

    setFlowRateTimeUnit: (value: TimeUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setFlowRateTimeUnit(value));
    },

    // Coverage
    setCoverageVolume: (value: number | "") => {
      dispatch(createAppMethodActions.setCoverageVolume(value));
    },

    setCoverageVolumeUnit: (value: VolumeUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setCoverageVolumeUnit(value));
    },

    setCoverageArea: (value: number | "") => {
      dispatch(createAppMethodActions.setCoverageArea(value));
    },

    setCoverageAreaUnit: (value: AreaUnit["desc"] | "") => {
      dispatch(createAppMethodActions.setCoverageAreaUnit(value));
    },

    // Overlap
    setOverlap: (value: number) => {
      dispatch(createAppMethodActions.setOverlap(value));
    },

    // Reset
    resetForm: () => {
      dispatch(createAppMethodActions.resetForm());
    },
  };
}
