import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store/index";
import { createAppMethodActions } from "./createAppMethodSlice";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { useEffect } from "react";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";

/**
 * Hook for updating form field values
 * Provides granular setters for all field properties
 */
export function useFormFieldValues() {
  const dispatch = useDispatch<AppDispatch>();

  const solution = useSelector(solverSelect.solution);
  const missingField = useSelector(solverSelect.missingField);

  const groundSpeedDistance = useSelector(
    fieldComponentsSelect.groundSpeed.distance,
  );
  const groundSpeedTime = useSelector(
    fieldComponentsSelect.groundSpeed.time,
  );
  const coverageVolume = useSelector(fieldComponentsSelect.coverage.volume);
  const coverageArea = useSelector(fieldComponentsSelect.coverage.area);
  const flowRateVolume = useSelector(fieldComponentsSelect.flowRate.volume);
  const flowRateTime = useSelector(fieldComponentsSelect.flowRate.time);
  const patternWidthDistance = useSelector(
    fieldComponentsSelect.patternWidth.distance,
  );

  useEffect(() => {
    if (!solution?.success || !missingField) return;

    const key = `${missingField.param}.${missingField.field}`;

    switch (key) {
      case "groundSpeed.distance":
        dispatch(createAppMethodActions.setGroundSpeedDistance(groundSpeedDistance));
        return;
      case "groundSpeed.time":
        dispatch(createAppMethodActions.setGroundSpeedTime(groundSpeedTime));
        return;
      case "coverage.volume":
        dispatch(createAppMethodActions.setCoverageVolume(coverageVolume));
        return;
      case "coverage.area":
        dispatch(createAppMethodActions.setCoverageArea(coverageArea));
        return;
      case "flowRate.volume":
        dispatch(createAppMethodActions.setFlowRateVolume(flowRateVolume));
        return;
      case "flowRate.time":
        dispatch(createAppMethodActions.setFlowRateTime(flowRateTime));
        return;
      case "patternWidth.distance":
        dispatch(createAppMethodActions.setPatternWidthDistance(patternWidthDistance));
        return;
    }
  }, [solution, dispatch, missingField, groundSpeedDistance, groundSpeedTime, coverageVolume, coverageArea, flowRateVolume, flowRateTime, patternWidthDistance]);

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

    setPatternWidthDistanceUnit: (value: LengthUnit["desc"]) => {
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
