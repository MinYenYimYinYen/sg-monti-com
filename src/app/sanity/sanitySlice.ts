import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SanityState = {
  programSanity: {
    selectedProgCodeId: string | null;
  };
};

const initialState: SanityState = {
  programSanity: {
    selectedProgCodeId: null,
  },
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState,
  reducers: {
    setSelectedProgCodeId(state, action: PayloadAction<string | null>) {
      state.programSanity.selectedProgCodeId = action.payload;
    },
  },
});

export const sanityActions = sanitySlice.actions;
export const sanityReducer = sanitySlice.reducer;
