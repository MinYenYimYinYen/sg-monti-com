import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CallLogReasonContract } from "@/app/realGreen/callLog/callLogReason/api/CallLogReasonContract";
import { CallLogReasonDoc } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";

type CallLogReasonState = {
  callLogReasonDocs: CallLogReasonDoc[];
};

const initialState: CallLogReasonState = {
  callLogReasonDocs: [],
};

export const getCallLogReasons = createStandardThunk<CallLogReasonContract, "getAll">({
  typePrefix: "callLogReason/getAll",
  apiPath: "/realGreen/callLog/callLogReason/api",
  opName: "getAll",
});

const callLogReasonSlice = createSlice({
  name: "callLogReason",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCallLogReasons.fulfilled, (state, action) => {
      state.callLogReasonDocs = action.payload;
    });
  },
});

export const callLogReasonReducer = callLogReasonSlice.reducer;
export const callLogReasonActions = {
  ...callLogReasonSlice.actions,
  getCallLogReasons,
};
