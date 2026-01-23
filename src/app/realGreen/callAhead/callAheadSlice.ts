import { createSlice } from "@reduxjs/toolkit";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAhead";
import { CallAheadContract } from "@/app/realGreen/callAhead/_lib/CallAheadContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getCallAheads = createStandardThunk<CallAheadContract, "getAll">({
  typePrefix: "callAhead/getCallAheads",
  apiPath: "/realGreen/callAhead/api",
  opName: "getAll",
});

interface CallAheadState {
  callAheads: CallAhead[];
}

const initialState: CallAheadState = {
  callAheads: [],
};

const callAheadSlice = createSlice({
  name: "callAhead",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallAheads.fulfilled, (state, action) => {
      state.callAheads = action.payload;
    });
  },
  selectors: {
    allCallAheads: (state) => state.callAheads,
    activeCallAheads: (state) =>
      state.callAheads.filter((callAhead) => callAhead.available),
    callAheadMap: (state) =>
      new Grouper(state.callAheads).toUniqueMap((c) => c.callAheadId),
  },
});

export const callAheadActions = { ...callAheadSlice.actions, getCallAheads };
export const callAheadSelect = { ...callAheadSlice.selectors };
export default callAheadSlice.reducer;
