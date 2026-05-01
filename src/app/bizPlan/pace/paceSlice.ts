import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";

type PaceSortMode = "byId" | "byDateRange";
type PaceSelectionSource = "progCode" | "allInProgress" | "none"

type PaceState = {
  sortMode: PaceSortMode;
  activeFilters: PaceCategory[];
  unfinishedOnly: boolean;
  selectionSource: PaceSelectionSource;
  selectedServCodeIds: string[];
  selectedProgCodeId: string | null;
};

const initialState: PaceState = {
  sortMode: "byDateRange",
  activeFilters: ["asap", "overdue", "inProgress"],
  unfinishedOnly: true,
  selectionSource: "none",
  selectedServCodeIds: [],
  selectedProgCodeId: null,
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
  },
});

export type { PaceSortMode, PaceSelectionSource };
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
