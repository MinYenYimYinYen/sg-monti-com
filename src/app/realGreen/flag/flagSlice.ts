import { createSlice } from "@reduxjs/toolkit";
import { Flag } from "@/app/realGreen/flag/Flag";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getFlags = createStandardThunk<FlagContract, "getAll">({
  typePrefix: "flag/getFlags",
  apiPath: "/realGreen/flag/api",
  opName: "getAll",
});

interface FlagState {
  flags: Flag[];
}

const initialState: FlagState = {
  flags: [],
};

const flagSlice = createSlice({
  name: "flag",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getFlags.fulfilled, (state, action) => {
      state.flags = action.payload;
    });
  },
  selectors: {
    allFlags: (state) => state.flags,
    activeFlags: (state) => state.flags.filter((flag) => flag.available),
    flagMap: (state) => new Grouper(state.flags).toUniqueMap((f) => f.flagId),
  },
});

export const flagActions = { ...flagSlice.actions, getFlags };
export const flagSelect = { ...flagSlice.selectors };
export default flagSlice.reducer;
