import { createSlice } from "@reduxjs/toolkit";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

export const getCallAheads = createStandardThunk<CallAheadContract, "getAll">({
  typePrefix: "callAhead/getCallAheads",
  apiPath: "/realGreen/callAhead/api",
  opName: "getAll",
});

interface CallAheadState {
  callAheadDocs: CallAheadDoc[];
}

const initialState: CallAheadState = {
  callAheadDocs: [],
};

const callAheadSlice = createSlice({
  name: "callAhead",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallAheads.fulfilled, (state, action) => {
      state.callAheadDocs = action.payload;
    });
  },
});

export const callAheadActions = { ...callAheadSlice.actions, getCallAheads };
export default callAheadSlice.reducer;
