import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FieldKey } from "./FieldSelector";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ValidationResult, SolverResult } from "../AppMethodSolver";

interface CreateAppMethodState {
  // Metadata
  appMethodId: string;
  description: string;

  // Field selection
  selectedFields: FieldKey[];

  // Ground Speed - individual properties
  groundSpeedDistance: number | "";
  groundSpeedDistanceUnit: LengthUnit["desc"] | "";
  groundSpeedTime: number | "";
  groundSpeedTimeUnit: TimeUnit["desc"] | "";

  // Pattern Width - individual properties
  patternWidthDistance: number | "";
  patternWidthDistanceUnit: LengthUnit["desc"] | "";

  // Flow Rate - individual properties
  flowRateVolume: number | "";
  flowRateVolumeUnit: VolumeUnit["desc"] | "";
  flowRateTime: number | "";
  flowRateTimeUnit: TimeUnit["desc"] | "";

  // Coverage - individual properties
  coverageVolume: number | "";
  coverageVolumeUnit: VolumeUnit["desc"] | "";
  coverageArea: number | "";
  coverageAreaUnit: AreaUnit["desc"] | "";

  // Overlap
  overlap: number;

  // Solver state
  validation: ValidationResult | null;
  solverResult: SolverResult | null;
}

const initialState: CreateAppMethodState = {
  appMethodId: "",
  description: "",
  selectedFields: [],

  // Ground Speed
  groundSpeedDistance: "",
  groundSpeedDistanceUnit: "",
  groundSpeedTime: "",
  groundSpeedTimeUnit: "",

  // Pattern Width
  patternWidthDistance: "",
  patternWidthDistanceUnit: "",

  // Flow Rate
  flowRateVolume: "",
  flowRateVolumeUnit: "",
  flowRateTime: "",
  flowRateTimeUnit: "",

  // Coverage
  coverageVolume: "",
  coverageVolumeUnit: "",
  coverageArea: "",
  coverageAreaUnit: "",

  // Overlap
  overlap: 2, // Double overlap by default

  // Solver state
  validation: null,
  solverResult: null,
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

    setSelectedFields: (state, action: PayloadAction<FieldKey[]>) => {
      state.selectedFields = action.payload;
    },

    // Ground Speed actions
    setGroundSpeedDistance: (state, action: PayloadAction<number | "">) => {
      state.groundSpeedDistance = action.payload;
    },

    setGroundSpeedDistanceUnit: (
      state,
      action: PayloadAction<LengthUnit["desc"] | "">
    ) => {
      state.groundSpeedDistanceUnit = action.payload;
    },

    setGroundSpeedTime: (state, action: PayloadAction<number | "">) => {
      state.groundSpeedTime = action.payload;
    },

    setGroundSpeedTimeUnit: (
      state,
      action: PayloadAction<TimeUnit["desc"] | "">
    ) => {
      state.groundSpeedTimeUnit = action.payload;
    },

    // Pattern Width actions
    setPatternWidthDistance: (state, action: PayloadAction<number | "">) => {
      state.patternWidthDistance = action.payload;
    },

    setPatternWidthDistanceUnit: (
      state,
      action: PayloadAction<LengthUnit["desc"] | "">
    ) => {
      state.patternWidthDistanceUnit = action.payload;
    },

    // Flow Rate actions
    setFlowRateVolume: (state, action: PayloadAction<number | "">) => {
      state.flowRateVolume = action.payload;
    },

    setFlowRateVolumeUnit: (
      state,
      action: PayloadAction<VolumeUnit["desc"] | "">
    ) => {
      state.flowRateVolumeUnit = action.payload;
    },

    setFlowRateTime: (state, action: PayloadAction<number | "">) => {
      state.flowRateTime = action.payload;
    },

    setFlowRateTimeUnit: (
      state,
      action: PayloadAction<TimeUnit["desc"] | "">
    ) => {
      state.flowRateTimeUnit = action.payload;
    },

    // Coverage actions
    setCoverageVolume: (state, action: PayloadAction<number | "">) => {
      state.coverageVolume = action.payload;
    },

    setCoverageVolumeUnit: (
      state,
      action: PayloadAction<VolumeUnit["desc"] | "">
    ) => {
      state.coverageVolumeUnit = action.payload;
    },

    setCoverageArea: (state, action: PayloadAction<number | "">) => {
      state.coverageArea = action.payload;
    },

    setCoverageAreaUnit: (
      state,
      action: PayloadAction<AreaUnit["desc"] | "">
    ) => {
      state.coverageAreaUnit = action.payload;
    },

    // Overlap action
    setOverlap: (state, action: PayloadAction<number>) => {
      state.overlap = action.payload;
    },

    // Solver actions
    setValidation: (state, action: PayloadAction<ValidationResult | null>) => {
      state.validation = action.payload;
    },

    setSolverResult: (state, action: PayloadAction<SolverResult | null>) => {
      state.solverResult = action.payload;
    },

    resetForm: (state) => {
      state.appMethodId = "";
      state.description = "";
      state.selectedFields = [];
      state.groundSpeedDistance = "";
      state.groundSpeedDistanceUnit = "";
      state.groundSpeedTime = "";
      state.groundSpeedTimeUnit = "";
      state.patternWidthDistance = "";
      state.patternWidthDistanceUnit = "";
      state.flowRateVolume = "";
      state.flowRateVolumeUnit = "";
      state.flowRateTime = "";
      state.flowRateTimeUnit = "";
      state.coverageVolume = "";
      state.coverageVolumeUnit = "";
      state.coverageArea = "";
      state.coverageAreaUnit = "";
      state.overlap = 2;
      state.validation = null;
      state.solverResult = null;
    },
  },
});

export const createAppMethodActions = createAppMethodSlice.actions;

export default createAppMethodSlice.reducer;
