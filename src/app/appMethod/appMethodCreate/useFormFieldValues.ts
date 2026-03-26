import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { createAppMethodActions } from "./createAppMethodSlice";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { useEffect } from "react";
import { fieldComponentsSelect } from "@/app/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { round } from "@/lib/primatives/numbers/round";

/**
 * Hook for updating form field values
 * Provides granular setters for all field properties
 */
export function useFormFieldValues() {
  const dispatch = useDispatch<AppDispatch>();

  const solution = useSelector(solverSelect.solution);
  const missingField = useSelector(solverSelect.missingField);
  const solveForField = useSelector(solverSelect.solveForField);
  const productType = useSelector(
    (state: any) => state.createAppMethod.productType,
  );

  const groundSpeedDistance = useSelector(
    fieldComponentsSelect.groundSpeed.distance,
  );
  const groundSpeedTime = useSelector(fieldComponentsSelect.groundSpeed.time);
  const coverageVolume = useSelector(fieldComponentsSelect.coverage.volume);
  const coverageArea = useSelector(fieldComponentsSelect.coverage.area);
  const flowRateVolume = useSelector(fieldComponentsSelect.flowRate.volume);
  const flowRateTime = useSelector(fieldComponentsSelect.flowRate.time);
  const patternWidthDistance = useSelector(
    fieldComponentsSelect.patternWidth.distance,
  );

  useEffect(() => {
    if (!solution?.success) return;

    // Use solveForField if explicitly set, otherwise use auto-detected missingField
    const fieldToUpdate = solveForField || missingField;
    if (!fieldToUpdate) return;

    const key = `${fieldToUpdate.param}.${fieldToUpdate.field}`;

    switch (key) {
      case "groundSpeed.distance":
        dispatch(
          createAppMethodActions.setGroundSpeedDistance(
            groundSpeedDistance === undefined
              ? undefined
              : round(groundSpeedDistance, 0.01),
          ),
        );
        return;
      case "groundSpeed.time":
        dispatch(
          createAppMethodActions.setGroundSpeedTime(
            groundSpeedTime === undefined
              ? undefined
              : round(groundSpeedTime, 0.01),
          ),
        );
        return;
      case "coverage.volume":
        dispatch(
          createAppMethodActions.setCoverageVolume(
            coverageVolume === undefined
              ? undefined
              : round(coverageVolume, 0.01),
          ),
        );
        return;
      case "coverage.area":
        dispatch(
          createAppMethodActions.setCoverageArea(
            coverageArea === undefined ? undefined : round(coverageArea, 0.01),
          ),
        );
        return;
      case "flowRate.volume":
        dispatch(
          createAppMethodActions.setFlowRateVolume(
            flowRateVolume === undefined
              ? undefined
              : round(flowRateVolume, 0.01),
          ),
        );
        return;
      case "flowRate.time":
        dispatch(
          createAppMethodActions.setFlowRateTime(
            flowRateTime === undefined ? undefined : round(flowRateTime, 0.01),
          ),
        );
        return;
      case "patternWidth.distance":
        dispatch(
          createAppMethodActions.setPatternWidthDistance(
            patternWidthDistance === undefined
              ? undefined
              : round(patternWidthDistance, 0.01),
          ),
        );
        return;
    }
  }, [
    solution,
    dispatch,
    missingField,
    solveForField,
    groundSpeedDistance,
    groundSpeedTime,
    coverageVolume,
    coverageArea,
    flowRateVolume,
    flowRateTime,
    patternWidthDistance,
  ]);

  return {
    // Product Type
    productType,
    setProductType: (value: "liquid" | "granular") => {
      dispatch(createAppMethodActions.setProductType(value));
    },

    // Metadata
    setAppMethodId: (value: string) => {
      dispatch(createAppMethodActions.setAppMethodId(value));
    },

    setDescription: (value: string) => {
      dispatch(createAppMethodActions.setDescription(value));
    },

    // Ground Speed
    setGroundSpeedDistance: (value: number | undefined) => {
      dispatch(createAppMethodActions.setGroundSpeedDistance(value));
    },

    setGroundSpeedDistanceUnit: (value: LengthUnit["desc"] | undefined) => {
      dispatch(createAppMethodActions.setGroundSpeedDistanceUnit(value));
    },

    setGroundSpeedTime: (value: number | undefined) => {
      dispatch(createAppMethodActions.setGroundSpeedTime(value));
    },

    setGroundSpeedTimeUnit: (value: TimeUnit["desc"] | undefined) => {
      dispatch(createAppMethodActions.setGroundSpeedTimeUnit(value));
    },

    // Pattern Width
    setPatternWidthDistance: (value: number | undefined) => {
      dispatch(createAppMethodActions.setPatternWidthDistance(value));
    },

    setPatternWidthDistanceUnit: (value: LengthUnit["desc"] | undefined) => {
      dispatch(createAppMethodActions.setPatternWidthDistanceUnit(value));
    },

    // Flow Rate
    setFlowRateVolume: (value: number | undefined) => {
      dispatch(createAppMethodActions.setFlowRateVolume(value));
    },

    setFlowRateVolumeUnit: (
      value: VolumeUnit["desc"] | WeightUnit["desc"] | undefined,
    ) => {
      dispatch(createAppMethodActions.setFlowRateVolumeUnit(value));
    },

    setFlowRateTime: (value: number | undefined) => {
      dispatch(createAppMethodActions.setFlowRateTime(value));
    },

    setFlowRateTimeUnit: (value: TimeUnit["desc"] | undefined) => {
      dispatch(createAppMethodActions.setFlowRateTimeUnit(value));
    },

    // Coverage
    setCoverageVolume: (value: number | undefined) => {
      dispatch(createAppMethodActions.setCoverageVolume(value));
    },

    setCoverageVolumeUnit: (
      value: VolumeUnit["desc"] | WeightUnit["desc"] | undefined,
    ) => {
      dispatch(createAppMethodActions.setCoverageVolumeUnit(value));
    },

    setCoverageArea: (value: number | undefined) => {
      dispatch(createAppMethodActions.setCoverageArea(value));
    },

    setCoverageAreaUnit: (value: AreaUnit["desc"] | undefined) => {
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
    resetGroundSpeed: () => {
      dispatch(createAppMethodActions.resetGroundSpeed());
    },
    resetPatternWidth: () => {
      dispatch(createAppMethodActions.resetPatternWidth());
    },
    resetFlowRate: () => {
      dispatch(createAppMethodActions.resetFlowRate());
    },
    resetCoverage: () => {
      dispatch(createAppMethodActions.resetCoverage());
    },
  };
}
