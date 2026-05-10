import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LookbackConfig, PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type PaceSortMode = "byId" | "byDateRange";
type PaceSelectionSource = "progCode" | "allInProgress" | "none";

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
  sortMode: PaceSortMode;
  activeFilters: PaceCategory[];
  unfinishedOnly: boolean;
  selectionSource: PaceSelectionSource;
  selectedServCodeIds: string[];
  selectedProgCodeId: string | null;
  lookbackConfig: LookbackConfig;
  matrixDisplayConfig: MatrixDisplayConfig;
};

const initialState: PaceState = {
  sortMode: "byDateRange",
  activeFilters: ["asap", "overdue", "inProgress"],
  unfinishedOnly: true,
  selectionSource: "none",
  selectedServCodeIds: [],
  selectedProgCodeId: null,
  lookbackConfig: {
    lookbackStart: dateStrings.yearStart(),
    completionThreshold: 0,
  },
  matrixDisplayConfig: {
    sortKey: "dateRange",
    filterAssigned: "all",
    filterCategories: [],
    filterDeltaDays: null,
    cspDisplay: "total",
  },
};

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setSortMode: (state, action: PayloadAction<PaceSortMode>) => {
      state.sortMode = action.payload;
    },
    setActiveFilters: (state, action: PayloadAction<PaceCategory[]>) => {
      state.activeFilters = action.payload;
    },
    setUnfinishedOnly: (state, action: PayloadAction<boolean>) => {
      state.unfinishedOnly = action.payload;
    },
    setSelectedServCodeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedServCodeIds = action.payload;
    },
    setSelectionSource: (state, action: PayloadAction<PaceSelectionSource>) => {
      state.selectionSource = action.payload;
    },
    setSelectedProgCodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedProgCodeId = action.payload;
    },
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
  },
});

export type {
  PaceSortMode,
  PaceSelectionSource,
  MatrixCspDisplay,
  MatrixSortKey,
  MatrixDisplayConfig,
};
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
