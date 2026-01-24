import { createSlice } from "@reduxjs/toolkit";
import { FlagDoc } from "@/app/realGreen/flag/FlagTypes";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getFlagDocs = createStandardThunk<FlagContract, "getAll">({
  typePrefix: "flag/getFlags",
  apiPath: "/realGreen/flag/api",
  opName: "getAll",
});

interface FlagState {
  flagDocs: FlagDoc[];
}

const initialState: FlagState = {
  flagDocs: [],
};

const flagSlice = createSlice({
  name: "flag",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getFlagDocs.fulfilled, (state, action) => {
      state.flagDocs = action.payload;
    });
  },

});

export const flagActions = { ...flagSlice.actions, getFlagDocs };
export default flagSlice.reducer;
