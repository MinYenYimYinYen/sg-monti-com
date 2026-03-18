import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  ValidationResult,
  SolverResult,
} from "../appMethodSolver/AppMethodSolver";

// Field types
export type FieldKey = "groundSpeed" | "patternWidth" | "flowRate" | "coverage";

interface CreateAppMethodState {
  // Metadata
  appMethodId: string;
  description: string;
  productType: "liquid" | "granular";

  // Ground Speed - individual properties
  groundSpeedDistance: number | undefined;
  groundSpeedDistanceUnit: LengthUnit["desc"] | undefined;
  groundSpeedTime: number | undefined;
  groundSpeedTimeUnit: TimeUnit["desc"] | undefined;

  // Pattern Width - individual properties
  patternWidthDistance: number | undefined;
  patternWidthDistanceUnit: LengthUnit["desc"] | undefined;

  // Flow Rate - individual properties
  flowRateVolume: number | undefined;
  flowRateVolumeUnit: VolumeUnit["desc"] | WeightUnit["desc"] | undefined;
  flowRateTime: number | undefined;
  flowRateTimeUnit: TimeUnit["desc"] | undefined;

  // Coverage - individual properties
  coverageVolume: number | undefined;
  coverageVolumeUnit: VolumeUnit["desc"] | WeightUnit["desc"] | undefined;
  coverageArea: number | undefined;
  coverageAreaUnit: AreaUnit["desc"] | undefined;

  // Overlap
  overlap: number;
}

const initialState: CreateAppMethodState = {
  appMethodId: "",
  description: "",
  productType: "liquid",

  // Ground Speed
  groundSpeedDistance: undefined,
  groundSpeedDistanceUnit: undefined,
  groundSpeedTime: undefined,
  groundSpeedTimeUnit: undefined,

  // Pattern Width
  patternWidthDistance: undefined,
  patternWidthDistanceUnit: undefined,

  // Flow Rate
  flowRateVolume: undefined,
  flowRateVolumeUnit: undefined,
  flowRateTime: undefined,
  flowRateTimeUnit: undefined,

  // Coverage
  coverageVolume: undefined,
  coverageVolumeUnit: undefined,
  coverageArea: undefined,
  coverageAreaUnit: undefined,

  // Overlap
  overlap: 2, // Double overlap by default
};

const createAppMethodSlice = createSlice({
  name: "createAppMethod",
  initialState,
  reducers: {
    setAppMethodId: (state, action: PayloadAction<string>) => {
      state.appMethodId = action.payload;
    },

    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },

    setProductType: (state, action: PayloadAction<"liquid" | "granular">) => {
      state.productType = action.payload;
    },

    // Ground Speed actions
    setGroundSpeedDistance: (
      state,
      action: PayloadAction<number | undefined>,
    ) => {
      state.groundSpeedDistance = action.payload;
    },

    setGroundSpeedDistanceUnit: (
      state,
      action: PayloadAction<LengthUnit["desc"] | undefined>,
    ) => {
      state.groundSpeedDistanceUnit = action.payload;
    },

    setGroundSpeedTime: (state, action: PayloadAction<number | undefined>) => {
      state.groundSpeedTime = action.payload;
    },

    setGroundSpeedTimeUnit: (
      state,
      action: PayloadAction<TimeUnit["desc"] | undefined>,
    ) => {
      state.groundSpeedTimeUnit = action.payload;
    },

    // Pattern Width actions
    setPatternWidthDistance: (
      state,
      action: PayloadAction<number | undefined>,
    ) => {
      state.patternWidthDistance = action.payload;
    },

    setPatternWidthDistanceUnit: (
      state,
      action: PayloadAction<LengthUnit["desc"] | undefined>,
    ) => {
      state.patternWidthDistanceUnit = action.payload;
    },

    // Flow Rate actions
    setFlowRateVolume: (state, action: PayloadAction<number | undefined>) => {
      state.flowRateVolume = action.payload;
    },

    setFlowRateVolumeUnit: (
      state,
      action: PayloadAction<VolumeUnit["desc"] | WeightUnit["desc"] | undefined>,
    ) => {
      state.flowRateVolumeUnit = action.payload;
    },

    setFlowRateTime: (state, action: PayloadAction<number | undefined>) => {
      state.flowRateTime = action.payload;
    },

    setFlowRateTimeUnit: (
      state,
      action: PayloadAction<TimeUnit["desc"] | undefined>,
    ) => {
      state.flowRateTimeUnit = action.payload;
    },

    // Coverage actions
    setCoverageVolume: (state, action: PayloadAction<number | undefined>) => {
      state.coverageVolume = action.payload;
    },

    setCoverageVolumeUnit: (
      state,
      action: PayloadAction<VolumeUnit["desc"] | WeightUnit["desc"] | undefined>,
    ) => {
      state.coverageVolumeUnit = action.payload;
    },

    setCoverageArea: (state, action: PayloadAction<number | undefined>) => {
      state.coverageArea = action.payload;
    },

    setCoverageAreaUnit: (
      state,
      action: PayloadAction<AreaUnit["desc"] | undefined>,
    ) => {
      state.coverageAreaUnit = action.payload;
    },

    // Overlap action
    setOverlap: (state, action: PayloadAction<number>) => {
      state.overlap = action.payload;
    },

    resetForm: (state) => {
      state.appMethodId = "";
      state.description = "";
      state.productType = "liquid";
      state.groundSpeedDistance = undefined;
      state.groundSpeedDistanceUnit = undefined;
      state.groundSpeedTime = undefined;
      state.groundSpeedTimeUnit = undefined;
      state.patternWidthDistance = undefined;
      state.patternWidthDistanceUnit = undefined;
      state.flowRateVolume = undefined;
      state.flowRateVolumeUnit = undefined;
      state.flowRateTime = undefined;
      state.flowRateTimeUnit = undefined;
      state.coverageVolume = undefined;
      state.coverageVolumeUnit = undefined;
      state.coverageArea = undefined;
      state.coverageAreaUnit = undefined;
      state.overlap = 2;
    },
    resetGroundSpeed: (state) => {
      state.groundSpeedDistance = undefined;
      state.groundSpeedDistanceUnit = undefined;
      state.groundSpeedTime = undefined;
      state.groundSpeedTimeUnit = undefined;
    },
    resetPatternWidth: (state) => {
      state.patternWidthDistance = undefined;
      state.patternWidthDistanceUnit = undefined;
    },
    resetFlowRate: (state) => {
      state.flowRateVolume = undefined;
      state.flowRateVolumeUnit = undefined;
      state.flowRateTime = undefined;
      state.flowRateTimeUnit = undefined;
    },
    resetCoverage: (state) => {
      state.coverageVolume = undefined;
      state.coverageVolumeUnit = undefined;
      state.coverageArea = undefined;
      state.coverageAreaUnit = undefined;
    },
  },
});

export const createAppMethodActions = createAppMethodSlice.actions;

export default createAppMethodSlice.reducer;
