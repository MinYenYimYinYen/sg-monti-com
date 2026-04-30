import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";

type PaceSortMode = "byId" | "byDateRange";

type PaceState = {
  sortMode: PaceSortMode;
  activeFilters: PaceCategory[];
  unfinishedOnly: boolean;
  selectedServCodeId: string | null;
};

const initialState: PaceState = {
  sortMode: "byDateRange",
  activeFilters: ["asap", "overdue", "inProgress"],
  unfinishedOnly: true,
  selectedServCodeId: null,
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
    setSelectedServCodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedServCodeId = action.payload;
    },
  },
});

export type { PaceSortMode };
export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
