import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LookbackConfig, PaceCategory } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

/** Which CSP variant to display in the AssignmentMatrix row headers. */
type MatrixCspDisplay = "total" | "perDay" | "perDayPerEmployee";

/** What field to sort progCodes by in the AssignmentMatrix. */
type MatrixSortKey =
  | "dateRange"
  | "assignedCount"
  | "count"
  | "size"
  | "price"
  | "rev";

type OptimizerConfig = {
  progCodeId: string | null;
  paddingDays: number;
  /** Saved so Cancel can restore both lookback fields */
  originalLookbackStart: string | null;
  originalCompletionThreshold: number | null;
  /** servCodeId → per-employee price/day override (integer dollars) */
  rateOverrides: Record<string, number>;
  /** servCodeIds whose dateRange.min is pinned — optimizer only moves the max */
  lockedStarts: Record<string, boolean>;
};

/** UI display/filter/sort config for the AssignmentMatrix. */
type MatrixDisplayConfig = {
  sortKey: MatrixSortKey;
  /** "all" = no filter, "withAssigned" = only rows with ≥1 assigned employee, "withoutAssigned" = only unassigned */
  filterAssigned: "all" | "withAssigned" | "withoutAssigned";
  /** Which PaceCategories to include. Empty = show all. */
  filterCategories: PaceCategory[];
  /**
   * Slider range for deltaDays filter. null = disabled (show all).
   * deltaDays > 0 means behind schedule, < 0 means ahead.
   */
  filterDeltaDays: [number, number] | null;
  cspDisplay: MatrixCspDisplay;
};

type PaceState = {
  lookbackConfig: LookbackConfig;
  matrixDisplayConfig: MatrixDisplayConfig;
  optimizerConfig: OptimizerConfig;
};

const initialState: PaceState = {
  lookbackConfig: {
    lookbackStart: dateStrings.yearStart(),
    completionThreshold: 0.5,
  },
  matrixDisplayConfig: {
    sortKey: "dateRange",
    filterAssigned: "all",
    filterCategories: [],
    filterDeltaDays: null,
    cspDisplay: "total",
  },
  optimizerConfig: {
    progCodeId: null,
    paddingDays: 0,
    originalLookbackStart: null,
    originalCompletionThreshold: null,
    rateOverrides: {},
    lockedStarts: {},
  },
};

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setLookbackStart: (state, action: PayloadAction<string>) => {
      state.lookbackConfig.lookbackStart = action.payload;
    },
    setLookbackCompletionThreshold: (state, action: PayloadAction<number>) => {
      state.lookbackConfig.completionThreshold = action.payload;
    },
    setMatrixSortKey: (state, action: PayloadAction<MatrixSortKey>) => {
      state.matrixDisplayConfig.sortKey = action.payload;
    },
    setMatrixFilterAssigned: (
      state,
      action: PayloadAction<MatrixDisplayConfig["filterAssigned"]>,
    ) => {
      state.matrixDisplayConfig.filterAssigned = action.payload;
    },
    setMatrixFilterCategories: (state, action: PayloadAction<PaceCategory[]>) => {
      state.matrixDisplayConfig.filterCategories = action.payload;
    },
    setMatrixFilterDeltaDays: (
      state,
      action: PayloadAction<[number, number] | null>,
    ) => {
      state.matrixDisplayConfig.filterDeltaDays = action.payload;
    },
    setMatrixCspDisplay: (state, action: PayloadAction<MatrixCspDisplay>) => {
      state.matrixDisplayConfig.cspDisplay = action.payload;
    },
    openOptimizer: (state, action: PayloadAction<{ progCodeId: string }>) => {
      state.optimizerConfig = {
        progCodeId: action.payload.progCodeId,
        paddingDays: 0,
        originalLookbackStart: state.lookbackConfig.lookbackStart,
        originalCompletionThreshold: state.lookbackConfig.completionThreshold,
        rateOverrides: {},
        lockedStarts: {},
      };
    },
    setOptimizerPaddingDays: (state, action: PayloadAction<number>) => {
      state.optimizerConfig.paddingDays = action.payload;
    },
    setOptimizerRateOverride: (
      state,
      action: PayloadAction<{ servCodeId: string; rate: number }>,
    ) => {
      state.optimizerConfig.rateOverrides[action.payload.servCodeId] =
        action.payload.rate;
    },
    setOptimizerLockedStart: (
      state,
      action: PayloadAction<{ servCodeId: string; locked: boolean }>,
    ) => {
      if (action.payload.locked) {
        state.optimizerConfig.lockedStarts[action.payload.servCodeId] = true;
      } else {
        delete state.optimizerConfig.lockedStarts[action.payload.servCodeId];
      }
    },
    closeOptimizer: (state) => {
      if (state.optimizerConfig.originalLookbackStart) {
        state.lookbackConfig.lookbackStart = state.optimizerConfig.originalLookbackStart;
      }
      if (state.optimizerConfig.originalCompletionThreshold !== null) {
        state.lookbackConfig.completionThreshold =
          state.optimizerConfig.originalCompletionThreshold;
      }
      state.optimizerConfig = {
        progCodeId: null,
        paddingDays: 0,
        originalLookbackStart: null,
        originalCompletionThreshold: null,
        rateOverrides: {},
        lockedStarts: {},
      };
    },
  },
});

export type { MatrixCspDisplay, MatrixSortKey, MatrixDisplayConfig, OptimizerConfig };
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
