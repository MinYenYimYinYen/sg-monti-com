import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type LoadoutFinishState = {
  finishLoadoutTouchedFields: Set<string>;
  showAllFinishLoadoutIssues: boolean;
};

const initialState: LoadoutFinishState = {
  finishLoadoutTouchedFields: new Set<string>(),
  showAllFinishLoadoutIssues: false,
};

export const loadoutFinishSlice = createSlice({
  name: "loadoutFinish",
  initialState,
  reducers: {
    markFinishLoadoutFieldTouched: (state, action: PayloadAction<string>) => {
      state.finishLoadoutTouchedFields.add(action.payload);
    },

    setShouldShowAllFinishLoadoutIssues: (state, action: PayloadAction<boolean>) => {
      state.showAllFinishLoadoutIssues = action.payload;
    },

    clearFinishLoadoutForm: (state) => {
      state.finishLoadoutTouchedFields = new Set<string>();
      state.showAllFinishLoadoutIssues = false;
    },
  },
});

export const loadoutFinishActions = { ...loadoutFinishSlice.actions };
export const loadoutFinishReducer = loadoutFinishSlice.reducer;
