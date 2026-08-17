import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type CustomerValueFilterState = {
  /** null = uninitialized (show all); [] = user explicitly selected none */
  selectedZips: string[] | null;
};

const initialState: CustomerValueFilterState = {
  selectedZips: null,
};

const customerValueFilterSlice = createSlice({
  name: "customerValueFilter",
  initialState,
  reducers: {
    setSelectedZips: (state, action: PayloadAction<string[]>) => {
      state.selectedZips = action.payload;
    },
    toggleZip: (state, action: PayloadAction<string>) => {
      const zip = action.payload;
      const current = state.selectedZips ?? [];
      const idx = current.indexOf(zip);
      if (idx === -1) {
        state.selectedZips = [...current, zip];
      } else {
        state.selectedZips = current.filter((z) => z !== zip);
      }
    },
    selectNone: (state) => {
      state.selectedZips = [];
    },
  },
});

export const customerValueFilterActions = customerValueFilterSlice.actions;
export const customerValueFilterReducer = customerValueFilterSlice.reducer;
