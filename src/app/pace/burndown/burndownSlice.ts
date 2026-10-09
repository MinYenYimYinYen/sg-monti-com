import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type BurndownState = {
  /** The date of the currently selected bar (ISO string), or null if none. */
  selectedDate: string | null;
  /** The groupId of the currently selected legend item, or null if none. */
  selectedGroupId: string | null;
};

const initialState: BurndownState = {
  selectedDate: null,
  selectedGroupId: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const burndownSlice = createSlice({
  name: "burndown",
  initialState,
  reducers: {
    selectDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
      // Selecting a bar clears any group selection
      state.selectedGroupId = null;
    },
    selectGroup: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
      // Selecting a group clears any bar selection
      state.selectedDate = null;
    },
    clearSelection: (state) => {
      state.selectedDate = null;
      state.selectedGroupId = null;
    },
  },
});

export const burndownActions = { ...burndownSlice.actions };
export const burndownReducer = burndownSlice.reducer;
