import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type BurndownState = {
  /** The date of the currently selected bar (ISO string), or null if none. */
  selectedDate: string | null;
  /** The groupId of the currently selected legend item, or null if none. */
  selectedGroupId: string | null;
  /**
   * The visible date window for the burndown chart slider.
   * Stored as ISO date strings so the window survives dataset re-renders
   * (e.g. goal multiplier changes). null means "use the full range".
   */
  dateWindowStart: string | null;
  dateWindowEnd: string | null;
};

const initialState: BurndownState = {
  selectedDate: null,
  selectedGroupId: null,
  dateWindowStart: null,
  dateWindowEnd: null,
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
    setDateWindow: (
      state,
      action: PayloadAction<{ start: string | null; end: string | null }>,
    ) => {
      state.dateWindowStart = action.payload.start;
      state.dateWindowEnd = action.payload.end;
    },
  },
});

export const burndownActions = { ...burndownSlice.actions };
export const burndownReducer = burndownSlice.reducer;
