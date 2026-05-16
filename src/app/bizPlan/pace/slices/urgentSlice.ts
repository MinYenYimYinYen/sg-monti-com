import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UrgentState = {
  /** servIds of services the production manager has checked off */
  checkedServIds: number[];
  /** servCodeIds of accordion items currently expanded in the checklist */
  expandedServCodeIds: string[];
};

const initialState: UrgentState = {
  checkedServIds: [],
  expandedServCodeIds: [],
};

const urgentSlice = createSlice({
  name: "urgent",
  initialState,
  reducers: {
    toggleChecked: (state, action: PayloadAction<number>) => {
      const idx = state.checkedServIds.indexOf(action.payload);
      if (idx === -1) {
        state.checkedServIds.push(action.payload);
      } else {
        state.checkedServIds.splice(idx, 1);
      }
    },
    toggleExpanded: (state, action: PayloadAction<string>) => {
      const idx = state.expandedServCodeIds.indexOf(action.payload);
      if (idx === -1) {
        state.expandedServCodeIds.push(action.payload);
      } else {
        state.expandedServCodeIds.splice(idx, 1);
      }
    },
    resetChecklist: (state) => {
      state.checkedServIds = [];
      state.expandedServCodeIds = [];
    },
  },
});

export const urgentActions = { ...urgentSlice.actions };
export const urgentReducer = urgentSlice.reducer;
